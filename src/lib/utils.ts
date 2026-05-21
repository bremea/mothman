export const BUILD_TARGET_SHORTHANDS: Record<string, string> = {
	'linux-desktop-64-bit': 'linux',
	'windows-desktop-64-bit': 'win64'
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

export const getEasternTime = () => {
	const now = new Date();

	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(now);

	const get = (type: string) => parts.find((p) => p.type === type)?.value;

	return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
};

export const toSqlSortableTimestamp = (timestamp: string): string => {
	const match = timestamp.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2}:\d{2})$/);

	if (!match) {
		throw new Error('timestamp must be formatted as DD-MM-YYYY HH:MM:SS');
	}

	const [, day, month, year, time] = match;

	return `${year}-${month}-${day} ${time}`;
};
