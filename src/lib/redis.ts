import { createClient } from '@redis/client';

const client = createClient({
	url: process.env.REDIS_URL
});

client.on('error', (err) => console.error('Redis error:', err));

export const connectRedis = async () => client.connect();

export const getCurrentSemanticVersion = async () => {
	return await client.get('auto-build-ver');
};

export const setCurrentSemanticVersion = async (value: string) => {
	return await client.set('auto-build-ver', value);
};

export const getTargetNextVersion = async (target: string) => {
	return await client.get(`nextver-${target}`);
};

export const setTargetNextVersion = async (target: string, value: string) => {
	return await client.set(`nextver-${target}`, value);
};

export default client;
