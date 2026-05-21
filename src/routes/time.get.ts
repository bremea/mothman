import { Route } from '@sapphire/plugin-api';
import { getEasternTime } from '../lib/utils.ts';

export class VersionRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		return getEasternTime();
	}
}
