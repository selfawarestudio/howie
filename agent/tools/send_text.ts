import { defineTool } from 'eve/tools';
import { z } from 'zod';

// Sends a real SMS via Twilio. The only way the agent reaches the fan, so it
// only gets called when there's something to say.
//
// Env vars (set locally in .env and in the Vercel project):
//   TWILIO_ACCOUNT_SID   AC...
//   TWILIO_AUTH_TOKEN    your auth token
//   TWILIO_FROM          your Twilio number, E.164, e.g. +12125550100
//   TWILIO_TO            your cell, E.164, e.g. +12015550123

export default defineTool({
  description:
    'Text the fan one short message (one or two lines). This sends a real SMS, so only call it when you actually have news.',
  inputSchema: z.object({
    text: z.string().describe('The message body. Keep it to a line or two.'),
  }),
  async execute({ text }) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    const to = process.env.TWILIO_TO;

    if (!sid || !token || !from || !to) {
      return { ok: false, error: 'Missing TWILIO_* env vars' };
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: text }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `Twilio ${res.status}`, detail };
    }
    return { ok: true, sent: text };
  },
});
