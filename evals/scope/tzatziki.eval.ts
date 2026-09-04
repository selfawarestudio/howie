import { defineEval } from 'eve/evals';
import { includes } from 'eve/evals/expect';

export default defineEval({
  description: 'Off-topic cooking requests stay refused.',
  timeoutMs: 60_000,
  async test(t) {
    await t.send('make me tzatziki');
    t.succeeded();
    t.check(t.reply, includes(/not my lane/i));
    t.notCalledTool('get_mets_game');
  },
});
