import { Route } from '@sapphire/plugin-api';
import { WebhookClient } from 'discord.js';
import { getBuilds, getBuildTargets, setEnvironmentVariables, submitBuild } from '../lib/requests.ts';
import { getCurrentSemanticVersion, setTargetNextVersion } from '../lib/redis.ts';
import { generateVersionString } from '../lib/utils.ts';

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

		const getTargets = await getBuildTargets();
		console.log(getTargets.status);
		console.log(await getTargets.text());
		if (getTargets.status != 200) {
			webhookClient.send({
				content: `❌ **Auto-build error:** error getting available build targets: endpoint returned ${getTargets.status}`
			});
			return response.status(500);
		}
		const targets = (await getTargets.json()) as any[];

		for (const target of targets) {
			// check if builds already running
			const buildsCheckReq = await getBuilds(target);

			if (buildsCheckReq.status != 200) {
				webhookClient.send({
					content: `❌ **Auto-build error:** error when checking builds in progress for target ${target}: endpoint returned ${buildsCheckReq.status}`
				});
				continue;
			}

			const buildCheckResponse = (await buildsCheckReq.json()) as any[];

			if (buildCheckResponse.some((val) => val.buildStatus == 'started' || val.buildStatus == 'queued')) {
				// cancel current build
				continue;
			}

			// set env vars
			const versionString = generateVersionString(buildVersion, buildChangeset, target, buildBranch);
			await setTargetNextVersion(target, versionString);
			const setEnvVars = await setEnvironmentVariables(versionString, target);

			if (setEnvVars.status != 200) {
				webhookClient.send({
					content: `❌ **Auto-build error:** error when setting env vars for ${target}: endpoint returned ${setEnvVars.status}`
				});
				continue;
			}

			// begin build
			const submitBuildReq = await submitBuild(target);

			if (submitBuildReq.status != 202) {
				webhookClient.send({
					content: `❌ **Auto-build error:** error when submitting build for ${target}: endpoint returned ${submitBuildReq.status}`
				});
				continue;
			}

			webhookClient.send({
				content: `✅ **Auto-builder:** began build for "${target}" (v${versionString})`
			});
		}

		return response.status(200);
	}
}
