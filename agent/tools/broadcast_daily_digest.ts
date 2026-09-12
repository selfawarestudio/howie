import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { broadcastDailyDigest } from '../lib/daily-broadcast.js';

export default defineTool({
  description:
    'Send the scheduled daily Mets digest to all configured iMessage recipients. ' +
    'Call once with the exact final digest text. Do not call for interactive replies.',
  inputSchema: z.object({
    text: z.string().min(1).describe('The exact final daily digest message to send everywhere.'),
  }),
  async execute({ text }) {
    return broadcastDailyDigest(text);
  },
});
