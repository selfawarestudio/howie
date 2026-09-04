import { defaultLinqAuth, linqChannel } from 'eve/channels/linq';

import { linqCredentials } from '../lib/linq.js';
import { isInMetsScope, OUT_OF_SCOPE_REPLY } from '../lib/mets-scope.js';
import { isAllowedSender } from '../lib/phones.js';

export default linqChannel({
  credentials: linqCredentials,
  async onMessage(ctx, message) {
    if (message.author.isBot) return null;
    if (!isAllowedSender(message.author.userName)) {
      console.warn(`[howie/linq] dropped inbound from ${message.author.userName ?? 'unknown'}`);
      return null;
    }

    const text = message.text?.trim() ?? '';
    if (!text) return null;

    if (!isInMetsScope(text)) {
      await ctx.thread.post(OUT_OF_SCOPE_REPLY);
      return null;
    }

    return { auth: defaultLinqAuth(message) };
  },
});
