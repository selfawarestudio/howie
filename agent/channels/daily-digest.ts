import { defineChannel, POST } from 'eve/channels';

interface DailyDigestState {
  token: string | null;
}

export interface DailyDigestTarget {
  token: string;
}

export default defineChannel<
  DailyDigestState,
  { state: DailyDigestState },
  DailyDigestTarget
>({
  kindHint: 'daily-digest',
  state: {
    token: null,
  },

  metadata(state) {
    return {
      token: state.token,
    };
  },

  context(state) {
    return { state };
  },

  routes: [
    // Eve only registers channels with at least one route.
    POST('/trigger', async () => new Response(null, { status: 204 })),
  ],

  async receive(input, { from }) {
    return from(input.target.token).send(input.message, {
      auth: input.auth,
      state: { token: input.target.token },
      mode: 'task',
    });
  },
});
