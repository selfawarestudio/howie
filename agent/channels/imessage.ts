import { defineChannel, POST } from 'eve/channels';
import type { Message } from 'spectrum-ts';
import { imessage } from 'spectrum-ts/providers/imessage';

import { isInMetsScope, OUT_OF_SCOPE_REPLY } from '../lib/mets-scope.js';
import {
  getSpectrum,
  sendToSpace,
  type ImessageDeliveryState,
} from '../lib/spectrum.js';

// Photon Spectrum (cloud, free tier). Register the webhook in the Photon dashboard:
//   POST https://<your-app>/eve/v1/imessage/webhook
//
// Env:
//   PHOTON_PROJECT_ID
//   PHOTON_PROJECT_SECRET
//   SPECTRUM_WEBHOOK_SECRET
//   IMESSAGE_RECIPIENTS         comma-separated phones for the daily digest (+1…)
//   IMESSAGE_RECIPIENT          legacy single-recipient fallback
//   IMESSAGE_ALLOW_FROM         optional comma-separated allow list; defaults to recipients

export interface ImessageReceiveTarget {
  phoneNumber: string;
}

type ImessageState = ImessageDeliveryState & { senderAddress: string | null };

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

function continuationToken(state: Pick<ImessageDeliveryState, 'spaceId' | 'recipientPhone'>) {
  return state.spaceId ?? state.recipientPhone ?? 'unknown';
}

function extractText(message: Message): string | null {
  const { content } = message;
  if (content.type === 'text') return content.text;
  if (content.type === 'markdown') return content.markdown;
  return null;
}

function replyText(message: unknown): string | null {
  if (typeof message === 'string') {
    const trimmed = message.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (message && typeof message === 'object' && 'content' in message) {
    return extractText(message as Message);
  }
  return null;
}

function parseAllowFrom(): string[] | '*' {
  const raw = process.env.IMESSAGE_ALLOW_FROM;
  if (raw?.trim() === '*') return '*';
  const allowList = parsePhoneList(
    raw ?? process.env.IMESSAGE_RECIPIENTS ?? process.env.IMESSAGE_RECIPIENT,
  );
  return allowList.length > 0 ? allowList : '*';
}

async function isAllowed(senderAddress: string | undefined): Promise<boolean> {
  const allow = parseAllowFrom();
  if (allow === '*') return true;
  if (!senderAddress) return false;
  return allow.includes(senderAddress);
}

export default defineChannel<
  ImessageState,
  { state: ImessageState; sendReply: (text: string) => Promise<void> },
  ImessageReceiveTarget
>({
  kindHint: 'imessage',
  state: {
    spaceId: null,
    recipientPhone: null,
    senderAddress: null,
  },

  metadata(state) {
    return {
      spaceId: state.spaceId,
      recipientPhone: state.recipientPhone,
    };
  },

  context(state, _session) {
    return {
      state,
      sendReply: (text: string) => sendToSpace(state, text),
    };
  },

  routes: [
    POST('/webhook', async (req, { send, waitUntil }) => {
      const spectrum = await getSpectrum();

      return spectrum.webhook(req, async (space, message) => {
        const text = extractText(message);
        if (!text) return;

        const imMsg = imessage(message);
        const senderAddress = imMsg.sender?.address;

        if (!(await isAllowed(senderAddress))) return;

        if (!isInMetsScope(text)) {
          waitUntil(space.send(OUT_OF_SCOPE_REPLY));
          return;
        }

        const state: ImessageState = {
          spaceId: space.id,
          recipientPhone: null,
          senderAddress: senderAddress ?? null,
        };

        waitUntil(
          send(text, {
            auth: {
              authenticator: 'imessage-webhook',
              issuer: 'photon',
              principalId: `imessage:${message.sender?.id ?? senderAddress ?? 'unknown'}`,
              principalType: 'user',
              attributes: senderAddress ? { address: senderAddress } : {},
            },
            continuationToken: continuationToken(state),
            state,
          }),
        );
      });
    }),
  ],

  async receive(input, { send }) {
    const phone = input.target.phoneNumber?.trim();
    if (!phone) {
      throw new Error('imessage channel receive requires target.phoneNumber');
    }

    const state: ImessageState = {
      spaceId: null,
      recipientPhone: phone,
      senderAddress: null,
    };

    return send(input.message, {
      auth: input.auth,
      continuationToken: continuationToken(state),
      state,
    });
  },

  events: {
    async 'message.completed'(eventData, channel) {
      if (eventData.finishReason === 'tool-calls') return;
      const text = replyText(eventData.message);
      if (!text) return;
      try {
        await sendToSpace(channel.state, text);
      } catch (error) {
        console.error('[howie/imessage] failed to send reply:', error);
        throw error;
      }
    },

    async 'turn.failed'(_eventData, channel) {
      try {
        await channel.sendReply('Hit a snag pulling that up — try again in a minute.');
      } catch (error) {
        console.error('[howie/imessage] failed to send error reply:', error);
        throw error;
      }
    },
  },
});
