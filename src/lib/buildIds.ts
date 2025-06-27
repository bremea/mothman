import { redis } from 'bun';

export const getBuildNumber = async (id: string): Promise<number> => {
	const num = await redis.get(id);
	if (num === null) return 0;
	else return parseInt(num);
};

export const incrementBuildNumber = async (id: string): Promise<number> => {
	const num = await redis.incr(id);
	return num;
};

export const setBuildNumber = async (id: string, val: number): Promise<void> => {
	await redis.set(id, val.toString());
};
