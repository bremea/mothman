import { Route } from '@sapphire/plugin-api';
import { getUpcomingLive } from '../lib/d1.ts';

export class VersionRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const limit = parseInt((request.query['limit'] as string) ?? '10');
		const offset = parseInt((request.query['offset'] as string) ?? '0');

		const upcoming = await getUpcomingLive(limit, offset);

		return response.json(upcoming);
	}
}
