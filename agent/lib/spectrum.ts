import { Spectrum } from 'spectrum-ts';
import { imessage } from 'spectrum-ts/providers/imessage';

export type ImessageDeliveryState = {
  spaceId: string | null;
  recipientPhone: string | null;
};

let spectrumPromise: ReturnType<typeof Spectrum> | null = null;

export function getSpectrum() {
  if (!spectrumPromise) {
    const projectId = process.env.PHOTON_PROJECT_ID;
    const projectSecret = process.env.PHOTON_PROJECT_SECRET;
    if (!projectId || !projectSecret) {
      throw new Error('Configure PHOTON_PROJECT_ID and PHOTON_PROJECT_SECRET');
    }

    spectrumPromise = Spectrum({
      projectId,
      projectSecret,
      providers: [imessage.config()],
      webhookSecret: process.env.SPECTRUM_WEBHOOK_SECRET,
    });
  }

  return spectrumPromise;
}

function isRetryablePhotonError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('connection dropped') ||
    message.includes('unavailable') ||
    message.includes('timeout')
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendToSpace(state: ImessageDeliveryState, text: string) {
  const spectrum = await getSpectrum();
  const im = imessage(spectrum);

  const space = state.spaceId
    ? await im.space.get(state.spaceId)
    : await im.space.create(await im.user(state.recipientPhone!));

  if (!state.spaceId) {
    state.spaceId = space.id;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await space.send(text);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isRetryablePhotonError(error)) throw error;
      await sleep(attempt * 1_000);
    }
  }

  throw lastError;
}
