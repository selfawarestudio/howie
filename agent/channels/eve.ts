import { eveChannel } from 'eve/channels/eve';
import { localDev, placeholderAuth, vercelOidc } from 'eve/channels/auth';

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and manual curl QA.
    localDev(),
    // Lets the Eve TUI and Vercel deployments reach the agent.
    vercelOidc(),
    // Rejects unauthenticated browser traffic in production.
    placeholderAuth(),
  ],
});
