import { Redis } from '@upstash/redis';

let client: Redis | null | undefined;

export function hasRedisEnv(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

export function getRedis(): Redis {
  if (!hasRedisEnv()) {
    throw new Error(
      'Upstash Redis is not configured. Run: npm run setup:redis (see README).',
    );
  }
  client ??= Redis.fromEnv();
  return client;
}
