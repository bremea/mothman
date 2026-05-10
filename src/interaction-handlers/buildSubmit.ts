import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ModalSubmitInteraction, WebhookClient, type InteractionResponse } from 'discord.js';
import { generateVersionString } from '../lib/utils';
import { getBuilds, setEnvironmentVariables, submitBuild } from '../lib/requests';
import { setTargetNextVersion } from '../lib/redis';

export class BuildSubmitHandler extends InteractionHandler {
	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit
		});
	}

	public override parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId !== 'buildSubmit') return this.none();

		return this.some();
	}

	public async run(interaction: ModalSubmitInteraction) {
		const statuses: { [key: string]: string } = {};

		const buildVersion = interaction.fields.getTextInputValue('buildVersion');
		const buildChangeset = interaction.fields.getTextInputValue('buildChangeset');
		const buildBranch = interaction.fields.getTextInputValue('buildBranch');
		const buildTargets = interaction.fields.getStringSelectValues('buildTargets');

		for (const target of buildTargets) {
			statuses[target] = `<a:loading:1386840225635893428> Checking target ${target}`;
		}

		const reply = await interaction.reply({
			content: Object.values(statuses).join('\n')
		});

		for (const target of buildTargets) {
			// check if builds already running
			const buildsCheckReq = await getBuilds(target);

			if (buildsCheckReq.status != 200) {
				statuses[target] = `❌ Non-200 response when checking builds in progress for target "${target}" (got ${buildsCheckReq.status})`;
				this.updateReply(reply, statuses);
				continue;
			}

			const buildCheckResponse = (await buildsCheckReq.json()) as any[];

			if (buildCheckResponse.some((val) => val.buildStatus == 'started' || val.buildStatus == 'queued')) {
				statuses[target] = `❌ One or more builds already in progress for "${target}"`;
				this.updateReply(reply, statuses);
				continue;
			}

			// set env vars
			const versionString = generateVersionString(buildVersion, buildChangeset, target, buildBranch);
			await setTargetNextVersion(target, versionString);
			const setEnvVars = await setEnvironmentVariables(versionString, target);

			if (setEnvVars.status != 200) {
				statuses[target] = `❌ Non-200 response when setting envvars for "${target}" (got ${setEnvVars.status})`;
				this.updateReply(reply, statuses);
				continue;
			}

			// begin build
			const submitBuildReq = await submitBuild(target);

			if (submitBuildReq.status != 202) {
				statuses[target] = `❌ Non-202 response when submitting build for target "${target}" (got ${submitBuildReq.status})`;
				this.updateReply(reply, statuses);
				continue;
			}

			statuses[target] = `✅ Build submitted for "${target}" (v${versionString})`;
			this.updateReply(reply, statuses);

			const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK! });

			webhookClient.send({
				content: `ℹ️ Build v${versionString} for target ${target} submitted by <@${interaction.user.id}>`
			});
		}
	}

	private async updateReply(reply: InteractionResponse<boolean>, statuses: { [key: string]: string }): Promise<void> {
		await reply.edit({
			content: Object.values(statuses).join('\n')
		});
	}
}
