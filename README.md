# Discord Bot Using Cloudflare Workers
## How it works

When you create a Bot on Discord, you can receive common events from the client as [webhooks](https://discord.com/developers/docs/resources/webhook). Discord will call a pre-configured HTTPS endpoint, and send details on the event in the JSON payload.

This bot is an example of writing a webhook based bot which:

- Uses the [Discord Interactions API](https://discord.com/developers/docs/interactions/receiving-and-responding)
- Uses [Cloudflare Workers](https://workers.cloudflare.com/) for hosting

## Creating bot on Discord

To start, we're going to create the application and bot on the Discord Developer Dashboard:

- Visit https://discord.com/developers/applications
- Click `New Application`, and choose a name
- Copy your Public Key and Application ID, and put them somewhere locally (we'll need these later)

![awwbot-ids](https://user-images.githubusercontent.com/534619/157505267-a361a871-e06f-4e3e-876f-cf401908dd49.png)

- Click on the `Bot` tab, and create a bot! Choose the same name as your app.
- Grab the token for your bot, and keep it somewhere safe locally (I like to put these tokens in [1password](https://1password.com/))
- Click on the `OAuth2` tab, and choose the `URL Generator`. Click the `bot` and `applications.commands` scopes.
- Click on the `Send Messages` and `Use Slash Commands` Bot Permissions
- Copy the Generated Url, and paste it into the browser. Select the server where you'd like to develop your bot.

## Creating your Cloudflare worker

Cloudflare Workers are a convenient way to host Discord bots due to the free tier, simple development model, and automatically managed environment (no VMs!).

- Visit the [Cloudflare dashboard](https://dash.cloudflare.com/)
- Click on the `Workers` tab, and create a new service using the same name as your Discord bot
- Make sure to [install the Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update/) and set it up.

### Storing secrets

The production service needs access to some of the information we saved earlier. To set those variables, run:

```
$ wrangler secret put DISCORD_TOKEN
$ wrangler secret put DISCORD_PUBLIC_KEY
$ wrangler secret put DISCORD_APPLICATION_ID
$ wrangler secret put DISCORD_TEST_GUILD_ID
```

## Running locally

> :bangbang: This depends on the beta version of the `wrangler` package, which better supports ESM on Cloudflare Workers.

Let's start by cloing the respository, and installing dependencies.  This requires at least v16 of Node.js:

```
$ npm install
```

Before testing our bot, we need to register our desired slash commands.  For this bot, we'll have a `/joke` command, and a `/hello` command, and a `/invite` command.  The name and description for these are kept separate in `commands.js`:

```js
module.exports = [
  {
    name: "invite",
    description: "Get bot invite link"
  },
  {
    name: "hello",
    description: "Get hello world using HTTPS Request"
  },
  {
    name: "joke",
    description: "Get random joke."
  }
];
```

The code to register our commands lives in `register.js`.  Commands can be registered globally, making them available for all servers with the bot installed, or they can be registered to a single server.  In this example - we're just going to focus on global commands:

```js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('colors');
require('dotenv').config();

// setup slash commands

const commands = require('./commands')
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('[Discord API] Started refreshing application (/) commands.'.yellow);
		await rest.put(
			process.env.DEVELOPMENT ? Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID, process.env.DISCORD_TEST_GUILD_ID)
      : Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
			{ body: commands },
		);
		console.log('[Discord API] Successfully reloaded application (/) commands.'.green);
	} catch (error) {
		console.error(error);
	}
})();
```

This command needs to be run locally, once before getting started:
```
$ DISCORD_TOKEN=**** DISCORD_APPLICATION_ID=**** node src/register.js
```

We're finally ready to run this code locally! Let's start by running our local development server:

```
$ npm run dev
```

When a user types a slash command, Discord will send an HTTP request to a given endpoint. During local development this can be a little challenging, so we're going to use a tool called `ngrok` to create an HTTP tunnel.

```
$ npm run ngrok
```

![forwardin](https://user-images.githubusercontent.com/534619/157511497-19c8cef7-c349-40ec-a9d3-4bc0147909b0.png)

This is going to bounce requests off of an external endpoint, and foward them to your machine.  Copy the HTTPS link provided by the tool.  It should look something like `https://8098-24-22-245-250.ngrok.io`.  Now head back to the Discord Developer Dashboard, and update the "Interactions Endpoint Url" for your bot:

![interactions-endpoint](https://user-images.githubusercontent.com/534619/157510959-6cf0327a-052a-432c-855b-c662824f15ce.png)

This is the process we'll use for local testing and development. When you've published your bot to Cloudflare, you will *want to update this field to use your Cloudflare Worker url.*


## Code deep dive

Most of the interesting code in this bot lives in `src/server.js`. Cloudflare Workers require exposing a `fetch` function, which is called as the entry point for each request. This code will largely do two things for us: validate the request is valid and actually came from Discord, and hand the request over to a router to help give us a little more control over execution.

```js
export default {
  /**
   * Every request to a worker will start in the `fetch` method.
   * Verify the signature with the request, and dispatch to the router.
   * @param {*} request A Fetch Request object
   * @param {*} env A map of key/value pairs with env vars and secrets from the cloudflare env.
   * @returns
   */
  async fetch(request, env) {
    if (request.method === 'POST') {
      // Using the incoming headers, verify this request actually came from discord.
      const signature = request.headers.get('x-signature-ed25519');
      const timestamp = request.headers.get('x-signature-timestamp');
      const body = await request.clone().arrayBuffer();
      const isValidRequest = verifyKey(
        body,
        signature,
        timestamp,
        env.DISCORD_PUBLIC_KEY
      );
      if (!isValidRequest) {
        console.error('Invalid Request');
        return new Response('Bad request signature.', { status: 401 });
      }
    }

    // Dispatch the request to the appropriate route
    return router.handle(request, env);
  },
};
```

All of the API calls from Discord in this example will be POSTed to `/`. From here, we will use the [`discord-interactions`](https://github.com/discord/discord-interactions-js) npm module to help us interpret the event, and to send results.

```js
router.post('/', async (request, env) => {
  const message = await request.json();
  console.log(message);
  if (message.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    console.log('Handling Ping request');
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (message.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
        if (message.data.name === 'invite') {
          const botId = env.DISCORD_APPLICATION_ID;
          return new JsonResponse({
            type: 4,
            data: {
              content: `[Click to use bot 🥳](https://discord.com/oauth2/authorize?client_id=${botId}&scope=applications.commands)`,
              flags: 64
            }
          })
        }

        if (message.data.name === 'hello') {
          return new JsonResponse({
            type: 4,
            data: {
              content: "👋 Hey i'm using HTTPS request for sending this message using interactions"
            }
          })
        }

        if (message.data.name === 'joke') {
          const joke = await getRandomJoke();
          return new JsonResponse({
            type: 4,
            data: {
              content: joke
            }
          })
        }
        console.error('Unknown Command');
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
    }
  }
);
```
