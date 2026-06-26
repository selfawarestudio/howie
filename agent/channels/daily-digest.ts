import { defineChannel } from 'eve/channels';

interface DailyDigestState {
  token: string | null;
}

export interface DailyDigestTarget {
  token: string;
}

export default defineChannel<DailyDigestState, { state: DailyDigestState }, DailyDigestTarget>({
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

  routes: [],

  async receive(input, { send }) {
    return send(input.message, {
      auth: input.auth,
      continuationToken: input.target.token,
      state: { token: input.target.token },
    });
  },
});
