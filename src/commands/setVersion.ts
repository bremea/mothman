import { Command } from '@sapphire/framework';
import { setCurrentSemanticVersion } from '../lib/redis.ts';

export class SetVersionCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, { ...options, preconditions: ['RoleCheck'] });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName('setver')
					.setDescription('Set the current semantic version to be used by auto-builder')
					.addStringOption((option) => option.setName('version').setDescription('New default semantic version').setRequired(true)),
			{ guildIds: ['1382087628181995771'] }
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		console.log(interaction)
		const versionString = interaction.options.getString('version', true);

		await setCurrentSemanticVersion(versionString);

		return interaction.reply({
			content: `✅ Set default semantic version for auto-builder to \`${versionString}\``
		});
	}
}
