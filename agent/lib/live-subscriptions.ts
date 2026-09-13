import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { easternDate } from './mlb.js';
import { normalizeHandle } from './phones.js';
import { getRedis, hasRedisEnv } from './redis.js';

export interface LiveSubscription {
  phone: string;
  gamePk: number;
  gameDate: string;
  opponent: string | null;
  firstPitchAt: string | null;
  reminderSent: boolean;
  lastScoringPlayCount: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

const REDIS_KEY = 'howie:live-subscriptions';
const DEV_STORE_PATH = path.join(process.cwd(), '.eve', 'live-subscriptions.json');

async function redisGetAll(): Promise<LiveSubscription[]> {
  const stored = await getRedis().get<LiveSubscription[]>(REDIS_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function redisSetAll(subs: LiveSubscription[]): Promise<void> {
  await getRedis().set(REDIS_KEY, subs);
}

async function fileGetAll(): Promise<LiveSubscription[]> {
  try {
    const raw = await readFile(DEV_STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LiveSubscription[]) : [];
  } catch {
    return [];
  }
}

async function fileSetAll(subs: LiveSubscription[]): Promise<void> {
  await mkdir(path.dirname(DEV_STORE_PATH), { recursive: true });
  await writeFile(DEV_STORE_PATH, JSON.stringify(subs, null, 2));
}

async function readAll(): Promise<LiveSubscription[]> {
  if (hasRedisEnv()) return redisGetAll();
  return fileGetAll();
}

async function writeAll(subs: LiveSubscription[]): Promise<void> {
  if (hasRedisEnv()) {
    await redisSetAll(subs);
    return;
  }
  await fileSetAll(subs);
}

function subscriptionKey(phone: string, gameDate: string): string {
  return `${normalizeHandle(phone)}:${gameDate}`;
}

export async function getActiveSubscriptions(): Promise<LiveSubscription[]> {
  const subs = await readAll();
  return subs.filter((sub) => sub.status === 'active');
}

export async function getActiveSubscriptionForPhone(phone: string): Promise<LiveSubscription | null> {
  const normalized = normalizeHandle(phone);
  const today = easternDate(0);
  const subs = await readAll();
  return (
    subs.find(
      (sub) => sub.phone === normalized && sub.gameDate === today && sub.status === 'active',
    ) ?? null
  );
}

export async function upsertSubscription(input: {
  phone: string;
  gamePk: number;
  gameDate: string;
  opponent: string | null;
  firstPitchAt: string | null;
  lastScoringPlayCount: number;
}): Promise<LiveSubscription> {
  const phone = normalizeHandle(input.phone);
  const subs = await readAll();
  const key = subscriptionKey(phone, input.gameDate);
  const existingIndex = subs.findIndex(
    (sub) => subscriptionKey(sub.phone, sub.gameDate) === key,
  );

  const next: LiveSubscription = {
    phone,
    gamePk: input.gamePk,
    gameDate: input.gameDate,
    opponent: input.opponent,
    firstPitchAt: input.firstPitchAt,
    reminderSent: existingIndex >= 0 ? subs[existingIndex]!.reminderSent : false,
    lastScoringPlayCount: input.lastScoringPlayCount,
    status: 'active',
    createdAt: existingIndex >= 0 ? subs[existingIndex]!.createdAt : new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    subs[existingIndex] = next;
  } else {
    subs.push(next);
  }

  await writeAll(subs);
  return next;
}

export async function cancelSubscription(phone: string, gameDate?: string): Promise<boolean> {
  const normalized = normalizeHandle(phone);
  const date = gameDate ?? easternDate(0);
  const subs = await readAll();
  let changed = false;

  for (const sub of subs) {
    if (sub.phone === normalized && sub.gameDate === date && sub.status === 'active') {
      sub.status = 'cancelled';
      changed = true;
    }
  }

  if (changed) await writeAll(subs);
  return changed;
}

export async function updateSubscription(
  phone: string,
  gameDate: string,
  patch: Partial<Pick<LiveSubscription, 'reminderSent' | 'lastScoringPlayCount' | 'status'>>,
): Promise<void> {
  const normalized = normalizeHandle(phone);
  const subs = await readAll();
  const index = subs.findIndex(
    (sub) => sub.phone === normalized && sub.gameDate === gameDate && sub.status === 'active',
  );
  if (index < 0) return;

  subs[index] = { ...subs[index]!, ...patch };
  await writeAll(subs);
}
