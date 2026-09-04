import { defineEval } from 'eve/evals';
import { satisfies } from 'eve/evals/expect';

export default defineEval({
  description: 'A live-game homer question is Mets baseball, not a refusal.',
  timeoutMs: 120_000,
  async test(t) {
    await t.send('who hit the homer earlier in this game to go up 2-1?');
    t.succeeded();
    t.log(String(t.reply ?? ''));
    t.check(
      t.reply,
      satisfies(
        (reply: unknown) => {
          const text = String(reply ?? '').trim();
          return text.length > 0 && !/not my lane/i.test(text);
        },
        'answers a Mets game question without refusing',
      ),
    );
  },
});
