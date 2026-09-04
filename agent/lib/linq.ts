import { connectLinqCredentials } from '@vercel/connect/eve';

export const linqConnectUid = process.env.LINQ_CONNECT_UID ?? 'linq/howie';
export const linqCredentials = connectLinqCredentials(linqConnectUid);

const LINQ_MESSAGES_URL = 'https://api.linqapp.com/api/partner/v3/messages';

export async function sendLinqText(to: string, text: string, idempotencyKey?: string) {
  const apiKey = await linqCredentials.apiKey();
  const res = await fetch(LINQ_MESSAGES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      to: [to],
      message: {
        parts: [{ type: 'text', value: text }],
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Linq messages.create returned HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
}
