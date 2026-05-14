import { Route } from '@sapphire/plugin-api';
import { WebhookClient, type WebhookMessageCreateOptions } from 'discord.js';

export class BuildNotifyRoute extends Route {
	public async run(request: Route.Request, response: Route.Response) {
		const buildData = (await request.readBodyJson()) as { versionString: string };

		sendWebhook({
			content: `✅ **Build upload SUCCESS!** Build v${buildData.versionString} is now live on Steam beta branch. <@&1504385868180226108>`,
			components: [
				{
					type: 1,
					components: [
						{
							type: 2,
							style: 5,
							label: 'Go to Steamworks',
							url: 'https://partner.steamgames.com/apps/builds/4089260'
						}
					]
				}
			]
		});
		sendWebhook(
			{
				content: `\`v${buildData.versionString}\` is now available on the Steam demo's beta branch. <@&1503223557877006396>`
			},
			process.env.DISCORD_PUBLIC_WEBHOOK!
		);

		return response.status(200);
	}
}

async function sendWebhook(content: WebhookMessageCreateOptions, url?: string) {
	const webhookClient = new WebhookClient({ url: url ?? process.env.DISCORD_WEBHOOK! });

	webhookClient.send(content);
}
