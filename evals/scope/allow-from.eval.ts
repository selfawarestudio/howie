import { defineEval } from 'eve/evals';
import { equals } from 'eve/evals/expect';

import { isAllowedSender } from '../../agent/lib/phones.js';

export default defineEval({
  description: 'Linq inbound only accepts digest recipients unless IMESSAGE_ALLOW_FROM is *.',
  async test(t) {
    const prevAllow = process.env.IMESSAGE_ALLOW_FROM;
    const prevRecipients = process.env.IMESSAGE_RECIPIENTS;
    const prevLegacy = process.env.IMESSAGE_RECIPIENT;
    try {
      delete process.env.IMESSAGE_ALLOW_FROM;
      process.env.IMESSAGE_RECIPIENTS = '+15551111111,+15552222222';
      delete process.env.IMESSAGE_RECIPIENT;

      t.check(isAllowedSender('+15551111111'), equals(true));
      t.check(isAllowedSender('15551111111'), equals(true));
      t.check(isAllowedSender('5551111111'), equals(true));
      t.check(isAllowedSender('+15552222222'), equals(true));
      t.check(isAllowedSender('+15559999999'), equals(false));
      t.check(isAllowedSender(undefined), equals(false));

      process.env.IMESSAGE_ALLOW_FROM = '*';
      t.check(isAllowedSender('+15559999999'), equals(true));
    } finally {
      restoreEnv('IMESSAGE_ALLOW_FROM', prevAllow);
      restoreEnv('IMESSAGE_RECIPIENTS', prevRecipients);
      restoreEnv('IMESSAGE_RECIPIENT', prevLegacy);
    }
  },
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
