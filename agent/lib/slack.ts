import { connectSlackCredentials } from '@vercel/connect/eve';
import { resolveSlackBotToken } from 'eve/channels/slack';

export const slackConnectUid = process.env.SLACK_CONNECT_UID ?? 'slack/howie';
export const slackCredentials = connectSlackCredentials(slackConnectUid);

export async function sendToSlackChannel(channelId: string, text: string) {
  const botToken = await resolveSlackBotToken(slackCredentials.botToken);
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${botToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: channelId,
      markdown_text: text,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Slack chat.postMessage returned HTTP ${res.status}`);
  }

  const body = (await res.json()) as { ok?: boolean; error?: string };
  if (body.ok !== true) {
    throw new Error(`Slack chat.postMessage failed: ${body.error ?? 'unknown_error'}`);
  }
}
