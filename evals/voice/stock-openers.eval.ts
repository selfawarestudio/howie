import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { defineEval } from 'eve/evals';
import { satisfies } from 'eve/evals/expect';

const instructions = readFileSync(join(process.cwd(), 'agent/instructions.md'), 'utf8');

export default defineEval({
  description: 'Voice instructions do not include canned recap templates to copy.',
  async test(t) {
    t.check(
      instructions,
      satisfies(
        (text: string) => !text.includes('Put it in the books — 4-2'),
        'no canned win recap example',
      ),
    );
    t.check(
      instructions,
      satisfies(
        (text: string) => !text.includes('Dropped a tough one 3-2'),
        'no canned loss recap example',
      ),
    );
  },
});
