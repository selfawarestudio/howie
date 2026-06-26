import {
  defaultSlackAuth,
  slackChannel,
  type SlackContext,
  type SlackMessage,
  type SlackMentionResult,
} from 'eve/channels/slack';

import { isInMetsScope, OUT_OF_SCOPE_REPLY } from '../lib/mets-scope.js';
import { slackCredentials } from '../lib/slack.js';

// Vercel Connect handles the bot token and webhook verification.
// Set up via: vercel connect create slack --triggers
// Then attach to Eve's Slack route (see README).
//
// Env:
//   SLACK_CONNECT_UID   Connect client UID, e.g. slack/howie

async function dispatchMetsOnly(
  ctx: SlackContext,
  message: SlackMessage,
): Promise<SlackMentionResult> {
  const text = message.markdown || message.text;
  if (!isInMetsScope(text)) {
    await ctx.thread.post(OUT_OF_SCOPE_REPLY);
    return null;
  }

  await ctx.thread.startTyping('Thinking...');
  return { auth: defaultSlackAuth(message, ctx) };
}

export default slackChannel({
  credentials: slackCredentials,
  onAppMention: dispatchMetsOnly,
  onDirectMessage: dispatchMetsOnly,
  events: {
    async 'message.completed'(eventData, channel) {
      if (eventData.finishReason === 'tool-calls') return;
      if (!eventData.message) return;
      try {
        await channel.thread.post(eventData.message);
      } catch (error) {
        console.error('[howie/slack] failed to post reply:', error);
        throw error;
      }
    },
  },
});
