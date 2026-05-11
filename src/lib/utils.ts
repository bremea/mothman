export const BUILD_TARGET_SHORTHANDS: Record<string, string> = {
	'linux-desktop-64-bit': 'linux',
	'windows-desktop-64-bit-main': 'win65'
};

export const generateVersionString = (semantic: string, changeset: string, target: string, branch?: string) => {
	return `${semantic}.${getETDate()}-${changeset}-${target}${branch ? `-${branch}` : ''}`;
};

export const getETDate = () => {
	const now = new Date();

	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		day: '2-digit',
		month: '2-digit',
		year: '2-digit'
	}).formatToParts(now);

	const get = (type: string) => parts.find((p) => p.type === type)?.value;

	return `${get('day')}${get('month')}${get('year')}`;
};
