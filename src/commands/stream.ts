import { Command } from '@sapphire/framework';
import { ComponentType, SlashCommandSubcommandBuilder } from 'discord.js';
import { addStream } from '../lib/d1.ts';

export class SetVersionCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, { ...options, preconditions: ['RoleCheck'] });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName('stream')
					.addSubcommand((subCommand) => subCommand.setName('schedule').setDescription('Manage featured livestreams').setDescription('Schedule a livestream to appear on the website')),
			{ guildIds: ['1382087628181995771'] }
		);
	}
	// make this also go live on bluesky

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.showModal({
			title: 'Schedule Livestream',
			custom_id: 'scheduleStream',
			components: [
				{
					type: ComponentType.Label,
					label: 'Stream Title',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'streamTitle',
						style: 1
					}
				},
				{
					type: ComponentType.Label,
					label: 'Youtube Video ID',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'videoId',
						style: 1
					}
				},
				{
					type: ComponentType.Label,
					label: 'Start Timestamp',
					description: 'Format as \`DD-MM-YYYY HH:MM:SS\` - always use New York timezone.',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'startTimestamp',
						style: 1
					}
				},
				{
					type: ComponentType.Label,
					label: 'End Timestamp',
					description: 'Format as \`DD-MM-YYYY HH:MM:SS\` - always use New York timezone.',
					component: {
						type: ComponentType.TextInput,
						required: true,
						custom_id: 'endTimestamp',
						style: 1
					}
				}
			]
		});

		try {
			const submitted = await interaction.awaitModalSubmit({
				filter: (i) => i.user.id === interaction.user.id && i.customId === 'scheduleStream',
				time: 300_000
			});

			const streamTitle = submitted.fields.getTextInputValue('streamTitle');
			const videoId = submitted.fields.getTextInputValue('videoId');
			const startTimestamp = submitted.fields.getTextInputValue('startTimestamp');
			const endTimestamp = submitted.fields.getTextInputValue('endTimestamp');

			if (!streamTitle || streamTitle.length > 24) {
				await submitted.reply({ content: ':x: **ERROR:** title must be between 1 and 24 characters' });
				throw new Error('title must be between 1 and 24 characters');
			}

			if (!videoId || videoId.length > 12) {
				await submitted.reply({ content: ':x: **ERROR:** videoId must be between 1 and 12 characters' });
				throw new Error('videoId must be between 1 and 12 characters');
			}

			const timestampPattern = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/;

			if (!timestampPattern.test(startTimestamp)) {
				await submitted.reply({ content: ':x: **ERROR:** start must be formatted as DD-MM-YYYY HH:MM:SS' });
				throw new Error('start must be formatted as DD-MM-YYYY HH:MM:SS');
			}

			if (!timestampPattern.test(endTimestamp)) {
				await submitted.reply({ content: ':x: **ERROR:** end must be formatted as DD-MM-YYYY HH:MM:SS' });
				throw new Error('end must be formatted as DD-MM-YYYY HH:MM:SS');
			}

			await addStream(streamTitle, videoId, startTimestamp, endTimestamp);

			await submitted.reply({ content: `Stream **${streamTitle}** has been scheduled to go live at ${startTimestamp} Eastern Time.` });
		} catch (error) {
			console.error('Schedule stream modal failed', error);
		}
	}
}
