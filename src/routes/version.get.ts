import { Route } from '@sapphire/plugin-api';

export class VersionRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		return response.status(200);
	}
}