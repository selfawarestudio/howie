import { connectSlackCredentials } from '@vercel/connect/eve';
import { slackChannel } from 'eve/channels/slack';

// Vercel Connect handles the bot token and webhook verification.
// Set up via: vercel connect create slack --triggers
// Then attach to Eve's Slack route (see README).
//
// Env:
//   SLACK_CONNECT_UID   Connect client UID, e.g. slack/howie

const connectUid = process.env.SLACK_CONNECT_UID ?? 'slack/howie';

export default slackChannel({
  credentials: connectSlackCredentials(connectUid),
});
