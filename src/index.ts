import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import '@sapphire/plugin-api/register';
import 'dotenv/config';
import { connectRedis } from './lib/redis.ts';

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

connectRedis();

client.login(process.env.TOKEN);