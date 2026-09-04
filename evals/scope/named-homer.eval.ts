import { defineEval } from 'eve/evals';
import { includes, satisfies } from 'eve/evals/expect';

export default defineEval({
  description: 'A dated Mets homer question names the batter from scoring plays.',
  timeoutMs: 120_000,
  async test(t) {
    await t.send('On 2026-09-02, who hit the Mets homer?');
    t.succeeded();
    t.calledTool('get_mets_game');
    t.check(t.reply, includes(/soto/i));
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => !/not my lane/i.test(String(reply ?? '')),
        'does not refuse a Mets homer question',
      ),
    );
  },
});
