import { Route } from '@sapphire/plugin-api';

export class VersionRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const easternTime = new Date().toLocaleString('en-US', {
			timeZone: 'America/New_York'
		});
		return easternTime;
	}
}
