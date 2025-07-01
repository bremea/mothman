import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, GuildMember, Message } from 'discord.js';

export class RoleCheckPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		// for Message Commands
		return this.checkRole(message.member as GuildMember);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		// for Slash Commands
		return this.checkRole(interaction.member as GuildMember);
	}

	private async checkRole(member: GuildMember) {
		return member.roles.cache.some((role) => role.id == '1386830783012143114')
			? this.ok()
			: this.error({ message: 'Missing Build Permissions Role (1386830783012143114)' });
	}
}
