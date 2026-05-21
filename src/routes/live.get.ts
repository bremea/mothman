import { Route } from '@sapphire/plugin-api';
import { getLive } from '../lib/d1.ts';

export class VersionRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const live = await getLive();

		return response.json(live);
	}
}
