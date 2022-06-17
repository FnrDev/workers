import { Router } from 'itty-router';
import { getRandomJoke } from './joke.js';
import { verifyKey } from 'discord-interactions';
import {
  InteractionType,
  InteractionResponseType,
  MessageFlags,
  InviteTargetType,
  RouteBases,
  Routes
} from "discord-api-types/v10";

class respond extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = Router();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID} use this endpoint to keep bot alive.`);
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
  const interaction = await request.json();
  console.log(interaction);
  if (interaction.type === InteractionType.Ping) {
    console.log('Handling Ping request');
    return new respond({
      type: InteractionResponseType.Pong,
    });
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.data.name === 'invite') {
          const botId = env.DISCORD_APPLICATION_ID;
          return new respond({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `[Click to use bot 🥳](https://discord.com/oauth2/authorize?client_id=${botId}&scope=applications.commands)`,
              flags: MessageFlags.Ephemeral
            }
          })
        }
        
        if (interaction.data.name === 'hello') {
          return new respond({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "👋 Hey i'm using HTTPS request for sending this message using interactions"
            }
          })
        }

        if (interaction.data.name === 'joke') {
          const joke = await getRandomJoke();
          return new respond({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: joke
            }
          })
        }

        if (interaction.data.name === 'help') {
          return new respond({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "👋 Here is list of all commands.\n`invite` - Get bot invite link\n`hello` - Get hello message\n`joke` - Get random joke."
            }
          })
        }

        if (interaction.data.name === 'activity') {
          if (!interaction.data.resolved?.channels) {
            return new respond({
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: 'Please update your discord app to use this command',
                flags: MessageFlags.Ephemeral
              }
            })
          }
          const postChannel = await fetch(`${RouteBases.api}${Routes.channelInvites(interaction.data.options[1].value)}`, {
            method: "POST",
            headers: { authorization: `Bot ${env.DISCORD_TOKEN}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              max_age: 0,
              target_type: InviteTargetType.EmbeddedApplication,
              target_application_id: interaction.data.options[0].value
            })
          })
          const invite = await postChannel.json();
          if (postChannel.status !== 200) {
            return new respond({
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `Error: ${invite.message}\nMake sure i have the "Create invite" permission in the voice channel`,
                flags: MessageFlags.Ephemeral
              }
            })
          }
          return new respond({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `[Click to open](<https://discord.gg/${invite.code}>)`
            }
          })
        }
        // no command response
        console.error('Unknown Command');
        return new respond({ error: 'Unknown Type' }, { status: 400 });
    }
  }
);
// Return "not found" response for all pages exept "/" route
router.all('*', () => new Response('Not Found.', { status: 404 }));

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
      console.log(signature, timestamp, env.DISCORD_PUBLIC_KEY);
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