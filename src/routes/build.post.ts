import { Route } from '@sapphire/plugin-api';
import { redis } from 'bun';
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

		processBuild(buildUrl, fullBuildInfo.buildtargetid, buildId.toString());

		return response.status(200);
	}
}

async function processBuild(url: string, target: string, buildId: string): Promise<void> {
	const uploadProcess = Bun.spawn(
		[
			'steam/sdk/tools/ContentBuilder/runbuild.sh',
			url,
			target,
			buildId,
			process.env.STEAM_USERNAME!
		],
		{ stdout: 'pipe' }
	);

	const output = await new Response(uploadProcess.stdout).text();
	const buffer = Buffer.from(output, 'utf-8');
	const log = new AttachmentBuilder(buffer, { name: 'log.txt' });

	const exitCode = await uploadProcess.exited;

	if (exitCode == 0) {
		sendWebhook({
			content: `✅ **Build upload SUCCESS!** Build ${buildId} for target ${target} is now live on Steam beta branch.`,
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
