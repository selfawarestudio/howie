import { connectSlackCredentials } from '@vercel/connect/eve';
import {
  defaultSlackAuth,
  slackChannel,
  type SlackContext,
  type SlackMessage,
  type SlackMentionResult,
} from 'eve/channels/slack';

import { isInMetsScope, OUT_OF_SCOPE_REPLY } from '../lib/mets-scope.js';

// Vercel Connect handles the bot token and webhook verification.
// Set up via: vercel connect create slack --triggers
// Then attach to Eve's Slack route (see README).
//
// Env:
//   SLACK_CONNECT_UID   Connect client UID, e.g. slack/howie

const connectUid = process.env.SLACK_CONNECT_UID ?? 'slack/howie';

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
  credentials: connectSlackCredentials(connectUid),
  onAppMention: dispatchMetsOnly,
  onDirectMessage: dispatchMetsOnly,
});
