import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import '@sapphire/plugin-api/register';
import { connectRedis } from './lib/redis.ts';
import 'dotenv/config';

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

console.log(`my token : ${process.env.TOKEN}`)

client.login(process.env.TOKEN);
