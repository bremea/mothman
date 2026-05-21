import type { Livestream, News } from './types.ts';
import Cloudflare from 'cloudflare';
import { getEasternTime, toSqlSortableTimestamp } from './utils.ts';

const cf = new Cloudflare({
	apiToken: process.env.CF_TOKEN
});

export const addStream = async (title: string, videoId: string, start: string, end: string) => {
	const rows: Livestream[] = [];

	for await (const queryResult of cf.d1.database.query(process.env['CF_D1_ID']!, {
		account_id: process.env['CF_ACCOUNT_ID']!,
		sql: `
			INSERT INTO streams (
			id,
			title,
			video,
			"begin",
			"end"
			)
			VALUES (
			lower(hex(randomblob(8))),
			?,
			?,
			?,
			?
			)
			RETURNING
			id,
			title,
			video,
			"begin",
			"end"
			`,
		params: [title, videoId, start, end]
	})) {
		rows.push(...((queryResult.results ?? []) as Livestream[]));
	}

	const inserted = rows[0];

	if (!inserted) {
		throw new Error('Livestream insert did not return a row');
	}

	return inserted;
};

export const getLive = async (): Promise<Livestream[]> => {
	const rows: Livestream[] = [];

	const easternSortable = toSqlSortableTimestamp(getEasternTime());

	for await (const queryResult of cf.d1.database.query(process.env['CF_D1_ID']!, {
		account_id: process.env['CF_ACCOUNT_ID']!,
		sql: `
			SELECT
			s.id,
			s.title,
			s.video,
			s."begin",
			s."end"
			FROM streams AS s
			WHERE
			(
				substr(s."begin", 7, 4) || '-' ||
				substr(s."begin", 4, 2) || '-' ||
				substr(s."begin", 1, 2) ||
				substr(s."begin", 11)
			) < ?
			AND
			(
				substr(s."end", 7, 4) || '-' ||
				substr(s."end", 4, 2) || '-' ||
				substr(s."end", 1, 2) ||
				substr(s."end", 11)
			) > ?
			ORDER BY
			(
				substr(s."begin", 7, 4) || '-' ||
				substr(s."begin", 4, 2) || '-' ||
				substr(s."begin", 1, 2) ||
				substr(s."begin", 11)
			) ASC
			`,
		params: [easternSortable, easternSortable]
	})) {
		rows.push(...((queryResult.results ?? []) as Livestream[]));
	}

	return rows;
};

export const getUpcomingLive = async (offset: number, limit: number): Promise<Livestream[]> => {
	if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
		throw new Error('limit must be an integer between 1 and 100');
	}

	if (!Number.isInteger(offset) || offset < 0) {
		throw new Error('offset must be a non-negative integer');
	}

	const rows: Livestream[] = [];
	const easternSortable = toSqlSortableTimestamp(getEasternTime());

	for await (const queryResult of cf.d1.database.query(process.env['CF_DB_ID']!, {
		account_id: process.env['CF_ACCOUNT_ID']!,
		sql: `
			SELECT
			s.id,
			s.title,
			s.video,
			s."begin",
			s."end"
			FROM streams AS s
			WHERE
			(
				substr(s."begin", 7, 4) || '-' ||
				substr(s."begin", 4, 2) || '-' ||
				substr(s."begin", 1, 2) ||
				substr(s."begin", 11)
			) > ?
			ORDER BY
			(
				substr(s."begin", 7, 4) || '-' ||
				substr(s."begin", 4, 2) || '-' ||
				substr(s."begin", 1, 2) ||
				substr(s."begin", 11)
			) ASC
			LIMIT CAST(? AS INTEGER)
			OFFSET CAST(? AS INTEGER)
			`,
		params: [easternSortable, String(limit), String(offset)]
	})) {
		rows.push(...((queryResult.results ?? []) as Livestream[]));
	}

	return rows;
};

export const getNews = async (offset: number, limit: number): Promise<News[]> => {
	if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
		throw new Error('limit must be an integer between 1 and 10');
	}

	if (!Number.isInteger(offset) || offset < 0) {
		throw new Error('offset must be a non-negative integer');
	}

	const rows: News[] = [];

	for await (const queryResult of cf.d1.database.query(process.env['CF_DB_ID']!, {
		account_id: process.env['CF_ACCOUNT_ID']!,
		sql: `
			SELECT
			n.id,
			n.title,
			n.content,
			n.posted
			FROM news AS n
			ORDER BY
			(
				substr(n.posted, 7, 4) || '-' ||
				substr(n.posted, 4, 2) || '-' ||
				substr(n.posted, 1, 2) ||
				substr(n.posted, 11)
			) DESC
			LIMIT CAST(? AS INTEGER)
			OFFSET CAST(? AS INTEGER)
			`,
		params: [String(limit), String(offset)]
	})) {
		rows.push(...((queryResult.results ?? []) as News[]));
	}

	return rows;
};