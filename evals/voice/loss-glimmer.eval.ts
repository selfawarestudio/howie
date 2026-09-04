import { defineEval } from 'eve/evals';
import { includes, satisfies } from 'eve/evals/expect';

export default defineEval({
  description: 'A close loss can carry one earned glimmer from the feed.',
  timeoutMs: 120_000,
  async test(t) {
    await t.send(
      'Recap the Mets game on 2026-08-28. Call get_mets_game with that date. One short message. Do not call broadcast_daily_digest.',
    );
    t.succeeded();
    t.calledTool('get_mets_game');
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
