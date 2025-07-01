import { Route } from '@sapphire/plugin-api';
import { redis } from 'bun';
import fs from 'fs';
import unzipper from 'unzipper';
import { AttachmentBuilder, WebhookClient, type WebhookMessageCreateOptions } from 'discord.js';

export class BuildRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const buildData = (await request.readBodyJson()) as any;

		const primaryArtifacts = buildData.links.artifacts.filter(
			(artifact: { key: string }) => artifact.key === 'primary'
		);

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

		const buildId = (await redis.get(fullBuildInfo.buildtargetid)) ?? 0;

		(async () => {
			await downloadArtifact(buildUrl, fullBuildInfo.buildtargetid, buildId.toString());
		})();

		return response.status(200);
	}
}

async function downloadArtifact(url: string, target: string, buildId: string): Promise<void> {
	// fetch zip
	const res = await fetch(url);
	if (!res.ok) {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Got non-200 response when trying to download artifact for target ${target} (got: ${res.status})`
		});
		return;
	}

	const zipPath = `./steam/sdk/tools/ContentBuilder/content/${target}.zip`;
	const destDir = `./steam/sdk/tools/ContentBuilder/content/${target}`;

	await Bun.write(zipPath, '', { createPath: true });

	const zipFile = Bun.file(zipPath);
	const writer = zipFile.writer();

	// download
	try {
		for await (const chunk of res.body!) {
			writer.write(chunk);
			await writer.flush();
		}
		await writer.end();
	} catch (err) {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Error encountered when downloading artifact zip`
		});
		return;
	}

	// make content dir if not exist
	if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

	// unzip
	await fs
		.createReadStream(zipPath)
		.pipe(unzipper.Extract({ path: destDir }))
		.promise();

	// set build version in app_build.vdf
	const vdfTemplate = 'steam/sdk/tools/ContentBuilder/scripts/app_build_template.vdf';
	const vdf = 'steam/sdk/tools/ContentBuilder/scripts/app_build.vdf';
	try {
		const original = await Bun.file(vdfTemplate).text();
		const updated = original.replace(/buildidreplacekey/g, `b${buildId}`);
		await Bun.write(vdf, updated);
	} catch (err) {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Error encountered when updating build number in app_build.vdf`
		});
		return;
	}

	// delete zip
	await zipFile.delete();

	// TODO check if other targets are still building and/or downloading

	// if no other builds pending, process build
	await processBuild(buildId);
}

async function processBuild(buildId: string): Promise<void> {
	const uploadProcess = Bun.spawn(['./runbuild.sh', process.env.STEAM_USERNAME!], {
		stdout: 'pipe',
		cwd: 'steam/sdk/tools/ContentBuilder'
	});

	const output = await new Response(uploadProcess.stdout).text();
	const buffer = Buffer.from(output, 'utf-8');
	const log = new AttachmentBuilder(buffer, { name: 'log.txt' });

	const exitCode = await uploadProcess.exited;

	if (exitCode == 0) {
		sendWebhook({
			content: `✅ **Build upload SUCCESS!** Build ${buildId} is now live on Steam beta branch.`,
			files: [log]
		});
	} else {
		sendWebhook({
			content: `<a:alert:1389301257331540220> **Build upload FAILED!** Exit code: ${exitCode}`,
			files: [log]
		});
	}
}

async function sendWebhook(content: WebhookMessageCreateOptions) {
	const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK! });

	webhookClient.send(content);
}
