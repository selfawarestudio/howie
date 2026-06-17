import { twilioChannel } from 'eve/channels/twilio';

// Env vars (set locally in .env and in the Vercel project):
//   TWILIO_ACCOUNT_SID              AC...
//   TWILIO_AUTH_TOKEN               your auth token
//   TWILIO_TO                       your cell, E.164
//   TWILIO_MESSAGING_SERVICE_SID    MG... (required for US SMS after A2P 10DLC)
//   TWILIO_FROM                     +1... (optional if using a Messaging Service)

export default twilioChannel({
  allowFrom: () => {
    const to = process.env.TWILIO_TO;
    if (!to) throw new Error('Missing TWILIO_TO');
    return to;
  },
  messaging: {
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    from: process.env.TWILIO_FROM,
  },
});
