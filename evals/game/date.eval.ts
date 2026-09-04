import { defineEval } from 'eve/evals';
import { equals } from 'eve/evals/expect';

import { easternDate, resolveGameDate } from '../../agent/lib/mlb.js';

export default defineEval({
  description: 'Empty get_mets_game dates resolve to today Eastern, not a blank schedule query.',
  async test(t) {
    t.check(resolveGameDate(undefined), equals(easternDate()));
    t.check(resolveGameDate(''), equals(easternDate()));
    t.check(resolveGameDate('   '), equals(easternDate()));
    t.check(resolveGameDate('2026-09-01'), equals('2026-09-01'));
  },
});
