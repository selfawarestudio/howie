import { defineSchedule } from 'eve/schedules';

import { runLiveMonitor } from '../lib/live-monitor.js';

export default defineSchedule({
  cron: '* * * * *',
  async run() {
    const result = await runLiveMonitor();
    if (result.checked > 0) {
      console.log(
        `[howie/live] checked ${result.checked} subscription(s) across ${result.games} game(s)`,
      );
    }
  },
});
