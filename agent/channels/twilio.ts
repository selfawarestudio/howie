import { twilioChannel } from 'eve/channels/twilio';

// Proactive morning texts and optional inbound replies from the fan.
// Env vars (set locally in .env and in the Vercel project):
//   TWILIO_ACCOUNT_SID   AC...
//   TWILIO_AUTH_TOKEN    your auth token
//   TWILIO_FROM          your Twilio number, E.164, e.g. +12125550100
//   TWILIO_TO            your cell, E.164, e.g. +12015550123

export default twilioChannel({
  // Only the fan can text in; resolver reads env at webhook time.
  allowFrom: () => {
    const to = process.env.TWILIO_TO;
    if (!to) throw new Error('Missing TWILIO_TO');
    return to;
  },
  messaging: {
    from: process.env.TWILIO_FROM,
  },
});
