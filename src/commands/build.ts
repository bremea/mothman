import { Command } from '@sapphire/framework';

export class BuildCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, { ...options });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('build')
				.setDescription('Trigger a new build & auto upload to Steam nightly branch')
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.reply({
			content: `Build triggered`,
			withResponse: true
		});
	}
}
