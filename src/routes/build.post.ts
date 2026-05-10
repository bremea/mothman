import { Route } from '@sapphire/plugin-api';
import fs from 'fs';
import fsp from 'fs/promises';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import unzipper from 'unzipper';
import { AttachmentBuilder, WebhookClient, type WebhookMessageCreateOptions } from 'discord.js';
import { getTargetNextVersion } from '../lib/redis';

export class BuildRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const buildData = (await request.readBodyJson()) as any;

		const primaryArtifacts = buildData.links.artifacts.filter((artifact: { key: string }) => artifact.key === 'primary');

		if (primaryArtifacts.length == 0) {
			sendWebhook({
				content: `<a:alert:1389301257331540220> **Build upload FAILED!** No primary artifacts found in webhook response (check if build failed?)`
			});
			return response.status(500);
		}

		const buildUrl = primaryArtifacts[0].files[0].href;
		const apiUrl = buildData.links.api_self.href;

		const unityApiReq = await fetch(`${process.env.UNITY_API_BASE_URL}${apiUrl}`, {
			method: 'GET',
			headers: {
				Authorization: process.env.UNITY_API_KEY as string,
				Accept: 'application/json'
			}
		});

		if (unityApiReq.status != 200) {
			sendWebhook({
				content: `<a:alert:1389301257331540220> **Build upload FAILED!** Got non-200 response when getting build info (got: ${unityApiReq.status})`
			});
			return response.status(500);
		}

		const fullBuildInfo = await unityApiReq.json();
		const versionString = await getTargetNextVersion(fullBuildInfo['buildtargetid']);
		if (!versionString) {
			sendWebhook({
				content: `<a:alert:1389301257331540220> **Build upload FAILED!** Error getting next version string for build target ${fullBuildInfo['buildtargetid']}`
			});
			return response.status(500);
		}

		(async () => {
			await downloadArtifact(buildUrl, fullBuildInfo.buildtargetid, versionString);
		})();

		return response.status(200);
	}
}

async function downloadArtifact(url: string, target: string, versionString: string): Promise<void> {
	// fetch zip
	const res = await fetch(url);
	if (!res.ok) {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Got non-200 response when trying to download artifact for target ${target} (got: ${res.status}) (for v${versionString})`
		});
		return;
	}

	const zipPath = `./steam/sdk/tools/ContentBuilder/content/${target}.zip`;
	const destDir = `./steam/sdk/tools/ContentBuilder/content/${target}`;

	// download
	try {
		const writeStream = fs.createWriteStream(zipPath);
		await pipeline(res.body as any, writeStream);
	} catch (err) {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Error encountered when downloading artifact zip (for v${versionString})`
		});
		return;
	}

	// make content dir if not exist
	await fsp.mkdir(destDir, { recursive: true });

	// unzip
	await pipeline(fs.createReadStream(zipPath), unzipper.Extract({ path: destDir }));

	// set build version in app_build.vdf
	const vdfTemplate = 'steam/sdk/tools/ContentBuilder/scripts/app_build_template.vdf';
	const vdf = 'steam/sdk/tools/ContentBuilder/scripts/app_build.vdf';
	try {
		const original = await fsp.readFile(vdfTemplate, 'utf-8');
		const updated = original.replace(/buildidreplacekey/g, `v${versionString}`);
		await fsp.writeFile(vdf, updated, 'utf-8');
	} catch (err) {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Error encountered when updating build number in app_build.vdf (for v${versionString})`
		});
		return;
	}

	// delete zip
	await fsp.unlink(zipPath);

	// TODO check if other targets are still building and/or downloading

	// if no other builds pending, process build
	await processBuild(versionString);
}

async function processBuild(versionString: string): Promise<void> {
	const { output, exitCode } = await new Promise<{ output: string; exitCode: number }>((resolve, reject) => {
		const proc = spawn('./runbuild.sh', [process.env.STEAM_USERNAME!], {
			cwd: 'steam/sdk/tools/ContentBuilder'
		});

		const chunks: Buffer[] = [];
		proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
		proc.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
		proc.on('error', reject);
		proc.on('close', (code) =>
			resolve({
				output: Buffer.concat(chunks).toString('utf-8'),
				exitCode: code ?? 1
			})
		);
	});

	const buffer = Buffer.from(output, 'utf-8');
	const log = new AttachmentBuilder(buffer, { name: 'log.txt' });

	if (exitCode === 0) {
		sendWebhook({
			content: `✅ **Build upload SUCCESS!** Build v${versionString} is now live on Steam beta branch.`,
			files: [log]
		});
	} else {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Exit code: ${exitCode} (for v${versionString})`,
			files: [log]
		});
	}
}

async function sendWebhook(content: WebhookMessageCreateOptions) {
	const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK! });

	webhookClient.send(content);
}
