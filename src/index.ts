import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import '@sapphire/plugin-api/register';

const client = new SapphireClient({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
	api: {
		prefix: '',
		origin: '*',
		listenOptions: {
			port: 4000
		}
	}
});

client.login(process.env.TOKEN);
