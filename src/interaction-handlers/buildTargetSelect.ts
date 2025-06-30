import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
	WebhookClient,
	type InteractionResponse,
	type StringSelectMenuInteraction
} from 'discord.js';
import { incrementBuildNumber } from '../lib/buildIds';

export class BuildTargetSelectHandler extends InteractionHandler {
	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.SelectMenu
		});
	}

	public override parse(interaction: StringSelectMenuInteraction) {
		if (interaction.customId !== 'buildTargetSelect') return this.none();

		return this.some();
	}

	public async run(interaction: StringSelectMenuInteraction) {
		const statuses: { [key: string]: string } = {};

		for (const target of interaction.values) {
			statuses[target] = `<a:loading:1386840225635893428> Checking target ${target}`;
		}

		const reply = await interaction.reply({
			content: Object.values(statuses).join('\n')
		});

		for (const target of interaction.values) {
			const versionNumber = await incrementBuildNumber(target);

			// check if builds already running
			const buildsCheckReq = await fetch(
				`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets/${target}/builds?per_page=25&page=1&showDeleted=false`,
				{
					method: 'GET',
					headers: {
						Authorization: process.env.UNITY_API_KEY as string,
						Accept: 'application/json'
					}
				}
			);

			if (buildsCheckReq.status != 200) {
				statuses[target] =
					`❌ Non-200 response when checking builds in progress for target "${target}" (got ${buildsCheckReq.status})`;
				this.updateReply(reply, statuses);
				continue;
			}

			const buildCheckResponse = (await buildsCheckReq.json()) as any[];

			if (
				buildCheckResponse.some(
					(val) => val.buildStatus == 'started' || val.buildStatus == 'queued'
				)
			) {
				statuses[target] = `❌ One or more builds already in progress for "${target}"`;
				this.updateReply(reply, statuses);
				continue;
			}

			// set env vars
			const setEnvVars = await fetch(
				`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets/${target}/envvars`,
				{
					method: 'PUT',
					headers: {
						Authorization: process.env.UNITY_API_KEY as string,
						Accept: 'application/json',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						envvars: {
							BUILD_ID: versionNumber.toString()
						}
					})
				}
			);

			if (setEnvVars.status != 200) {
				statuses[target] =
					`❌ Non-200 response when setting envvars for "${target}" (got ${setEnvVars.status})`;
				this.updateReply(reply, statuses);
				continue;
			}

			// begin build
			const submitBuildReq = await fetch(
				`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets/${target}/builds`,
				{
					method: 'POST',
					headers: {
						Authorization: process.env.UNITY_API_KEY as string,
						Accept: 'application/json'
					}
				}
			);

			if (submitBuildReq.status != 202) {
				statuses[target] =
					`❌ Non-202 response when submitting build for target "${target}" (got ${submitBuildReq.status})`;
				this.updateReply(reply, statuses);
				continue;
			}

			statuses[target] = `✅ Build submitted for "${target}" (b${versionNumber})`;
			this.updateReply(reply, statuses);

			const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK! });

			webhookClient.send({
				content: `ℹ️ Build b${versionNumber} for target ${target} submitted by <@${interaction.user.id}>`
			});
		}
	}

	private async updateReply(
		reply: InteractionResponse<boolean>,
		statuses: { [key: string]: string }
	): Promise<void> {
		await reply.edit({
			content: Object.values(statuses).join('\n')
		});
	}
}
