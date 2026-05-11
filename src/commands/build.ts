import { Command } from '@sapphire/framework';
import { ComponentType, type APISelectMenuOption } from 'discord.js';
import { getBuildTargets } from '../lib/requests.ts';
import { getCurrentSemanticVersion, getLatestKnownChangeset } from '../lib/redis.ts';

export class BuildCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, { ...options, preconditions: ['RoleCheck'] });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('build').setDescription('Trigger a new build & auto upload to Steam nightly branch'), { guildIds: ['1382087628181995771'] });
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const currentDefaultVersion = await getCurrentSemanticVersion();
		const latestKnownChangeset = await getLatestKnownChangeset();
		const unityApiReq = await getBuildTargets();

		if (unityApiReq.status != 200) {
			await interaction.reply({
				content: `Error: non-200 response when fetching build targets (got ${unityApiReq.status})`,
				withResponse: true
			});
			return;
		}

		const unityApiResponse = (await unityApiReq.json()) as any[];
		const buildTargets: APISelectMenuOption[] = [];

		for (const buildTarget of unityApiResponse) {
			const targetData = {
				label: buildTarget.name as string,
				value: buildTarget.buildtargetid as string
			} as APISelectMenuOption;

			const windowsEmoji = '1386828866924056747';
			const linuxEmoji = '1386828889136824420';
			const macosEmoji = '1386828913631821924';

			if (targetData.label.includes('Windows')) {
				targetData.emoji = { id: windowsEmoji };
			}

			if (targetData.label.includes('Linux')) {
				targetData.emoji = { id: linuxEmoji };
			}

			if (targetData.label.includes('Mac')) {
				targetData.emoji = { id: macosEmoji };
			}

			buildTargets.push(targetData);
		}

		await interaction.showModal({
			title: 'Submit Build',
			custom_id: 'buildSubmit',
			components: [
				{
					type: ComponentType.Label,
					label: 'Version',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'buildVersion',
						style: 1,
						value: currentDefaultVersion ?? ''
					}
				},
				{
					type: ComponentType.Label,
					label: 'Changeset Number',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'buildChangeset',
						style: 1,
						value: latestKnownChangeset ?? ''
					}
				},
				{
					type: ComponentType.Label,
					label: 'Branch',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'buildBranch',
						style: 1,
						value: 'main'
					}
				},
				{
					type: ComponentType.Label,
					label: 'Target',
					component: {
						type: ComponentType.StringSelect,
						custom_id: 'buildTargets',
						required: true,
						min_values: 1,
						max_values: buildTargets.length,
						options: buildTargets
					}
				}
			]
		});
	}
}
