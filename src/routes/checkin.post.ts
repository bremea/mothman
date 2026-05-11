import { Route } from '@sapphire/plugin-api';
import { WebhookClient } from 'discord.js';
import { getBuilds, getBuildTargets, setEnvironmentVariables, submitBuild } from '../lib/requests.ts';
import { getCurrentSemanticVersion, setLatestKnownChangeset, setTargetNextVersion } from '../lib/redis.ts';
import { BUILD_TARGET_SHORTHANDS, generateVersionString } from '../lib/utils.ts';

export class CheckinRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const checkInData = (await request.readBodyJson()) as any;
		const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK! });

		const buildVersion = await getCurrentSemanticVersion();
		if (!buildVersion) {
			webhookClient.send({
				content: `❌ **Auto-build error:** error getting current semantic version: returned null (is redis connected?)`
			});
			return response.status(500);
		}

		const buildChangeset = checkInData['PLASTIC_CHANGESET_ID'];
		const buildBranch = checkInData['PLASTIC_BRANCH_NAME'];
		await setLatestKnownChangeset(buildChangeset);

		const getTargets = await getBuildTargets();
		if (getTargets.status != 200) {
			webhookClient.send({
				content: `❌ **Auto-build error:** error getting available build targets: endpoint returned ${getTargets.status}`
			});
			return response.status(500);
		}
		const targets = (await getTargets.json()) as any[];

		for (const target of targets) {
			const fullTargetId = target['buildtargetid'];
			const targetShorthand = BUILD_TARGET_SHORTHANDS[fullTargetId] ?? fullTargetId;
			// check if builds already running
			const buildsCheckReq = await getBuilds(fullTargetId);

			if (buildsCheckReq.status != 200) {
				console.log(await buildsCheckReq.text());
				webhookClient.send({
					content: `❌ **Auto-build error:** error when checking builds in progress for target ${fullTargetId} (${targetShorthand}): endpoint returned ${buildsCheckReq.status}`
				});
				continue;
			}

			const buildCheckResponse = (await buildsCheckReq.json()) as any[];

			if (buildCheckResponse.some((val) => val.buildStatus == 'started' || val.buildStatus == 'queued')) {
				// cancel current build
				continue;
			}

			// set env vars
			const versionString = generateVersionString(buildVersion, buildChangeset, targetShorthand, buildBranch);
			await setTargetNextVersion(fullTargetId, versionString);
			const setEnvVars = await setEnvironmentVariables(versionString, fullTargetId);

			if (setEnvVars.status != 200) {
				webhookClient.send({
					content: `❌ **Auto-build error:** error when setting env vars for ${fullTargetId} (${targetShorthand}): endpoint returned ${setEnvVars.status}`
				});
				continue;
			}

			// begin build
			const submitBuildReq = await submitBuild(fullTargetId);

			if (submitBuildReq.status != 202) {
				webhookClient.send({
					content: `❌ **Auto-build error:** error when submitting build for ${fullTargetId} (${targetShorthand}): endpoint returned ${submitBuildReq.status}`
				});
				continue;
			}

			webhookClient.send({
				content: `✅ **Auto-builder:** began build for v${versionString} (${fullTargetId})`
			});
		}

		return response.status(200);
	}
}
