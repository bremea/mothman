import { Route } from '@sapphire/plugin-api';
import { getNews } from '../lib/d1.ts';

export class VersionRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const limit = parseInt((request.query['limit'] as string) ?? '10');
		const offset = parseInt((request.query['offset'] as string) ?? '0');

		const live = await getNews(limit, offset);

		return response.json(live);
	}
}
