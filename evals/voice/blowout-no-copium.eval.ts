import { defineEval } from 'eve/evals';
import { satisfies } from 'eve/evals/expect';

export default defineEval({
  description: 'A blowout loss does not invent prospect glimmers.',
  timeoutMs: 120_000,
  async test(t) {
    await t.send(
      'Recap the Mets game on 2026-08-26. Call get_mets_game with that date. One short message. Do not call broadcast_daily_digest.',
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
        (reply: unknown) => !/benge|mclean|ewing/i.test(String(reply ?? '')),
        'does not invent prospect name-drops',
      ),
    );
  },
});
