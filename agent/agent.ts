import { defineAgent } from 'eve';

export default defineAgent({
  // Resolves through Vercel AI Gateway — no provider API key needed on Vercel.
  // A small/fast model is plenty here; the tool does the work, the model just writes one line.
  model: 'openai/gpt-5.4-mini',
});
