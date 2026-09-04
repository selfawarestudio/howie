import { defineEval } from 'eve/evals';
import { includes, satisfies } from 'eve/evals/expect';

import { dailyPrompt } from '../../agent/schedules/daily.js';

export default defineEval({
  description: 'The 9am digest shape recaps a close loss with one earned feed thread.',
  timeoutMs: 120_000,
  async test(t) {
    const prompt = dailyPrompt('2026-08-28', '2026-08-29').replace(
      /When you have the final digest[\s\S]*$/,
      'Do not call broadcast_daily_digest. Reply with the digest text only.',
    );
    await t.send(prompt);
    t.succeeded();
    t.calledTool('get_mets_game');
    t.calledTool('get_mets_club');
    t.notCalledTool('broadcast_daily_digest');
    t.log(String(t.reply ?? ''));
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => String(reply ?? '').trim().length > 0,
        'reply is non-empty',
      ),
    );
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => !/not my lane/i.test(String(reply ?? '')),
        'does not refuse a Mets recap',
      ),
    );
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => !/ya gotta believe/i.test(String(reply ?? '')),
        'no ya gotta believe mantra',
      ),
    );
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => !/future is bright/i.test(String(reply ?? '')),
        'no future is bright copium',
      ),
    );
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => !/wait till next year/i.test(String(reply ?? '')),
        'no wait till next year copium',
      ),
    );
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) =>
          /lost|loss|drop|fell|fall|beat us|took us|1-3|3-1/i.test(String(reply ?? '')),
        'sounds like a loss',
      ),
    );
    t.check(t.reply, includes(/benge/i));
  },
});
