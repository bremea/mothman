import { Route } from '@sapphire/plugin-api';

export class BuildRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		return response.json({ pong: true });
	}
}
