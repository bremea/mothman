import { Command } from '@sapphire/framework';
import {
	ComponentType,
	MessageFlags,
	type APIActionRowComponent,
	type APIStringSelectComponent,
	type SelectMenuComponentOptionData
} from 'discord.js';

export class BuildCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, { preconditions: ['RoleCheck'], ...options });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('build')
				.setDescription('Trigger a new build & auto upload to Steam nightly branch')
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const unityApiReq = await fetch(
			`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets`,
			{
				method: 'GET',
				headers: {
					Authorization: process.env.UNITY_API_KEY as string,
					Accept: 'application/json'
				}
			}
		);

		if (unityApiReq.status != 200) {
			await interaction.reply({
				content: `Error: non-200 response when fetching build targets (got ${unityApiReq.status})`,
				withResponse: true
			});
			return;
		}

		const unityApiResponse = (await unityApiReq.json()) as any[];
		const buildTargets: SelectMenuComponentOptionData[] = [];

		for (const buildTarget of unityApiResponse) {
			const targetData = {
				label: buildTarget.name as string,
				value: buildTarget.buildtargetid as string
			} as SelectMenuComponentOptionData;

			const windowsEmoji = '1386828866924056747';
			const linuxEmoji = '1386828889136824420';
			const macosEmoji = '1386828913631821924';

			if (targetData.label.includes('Windows')) {
				targetData.emoji = windowsEmoji;
			}

			if (targetData.label.includes('Linux')) {
				targetData.emoji = linuxEmoji;
			}

			if (targetData.label.includes('Mac')) {
				targetData.emoji = macosEmoji;
			}

			buildTargets.push(targetData);
		}

		console.log("redis url: " + process.env.REDIS_URL)

		await interaction.reply({
			content: `Select Build Target(s):`,
			withResponse: true,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							custom_id: 'buildTargetSelect',
							type: ComponentType.StringSelect,
							min_values: 1,
							max_values: buildTargets.length,
							options: buildTargets
						} as APIStringSelectComponent
					]
				} as APIActionRowComponent<APIStringSelectComponent>
			],
			flags: [MessageFlags.Ephemeral]
		});
	}
}
