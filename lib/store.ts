/**
 * Circle persistence — the off-chain coordinator.
 *
 * Uses Upstash Redis when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 * are set (serverless, survives deploys); otherwise falls back to an in-process
 * Map so local `npm run dev` works with zero setup (ephemeral — resets on
 * restart, and does NOT persist across serverless invocations in prod).
 *
 * Only circle *metadata* lives here. All money movement is on-chain and
 * non-custodial — the store never holds funds or keys.
 */
import { Redis } from "@upstash/redis";

export interface CircleMember {
  name: string;
  address: string;
  reputation: number;
  joinedAt: number;
}

export interface StoredCircle {
  id: string;
  name: string;
  /** Whole USDCx of dues each member splits to the round's recipient. */
  contribution: string;
  /** Whole USDCx each member locks as personal savings per contribution. */
  save: string;
  /** Number of seats (= rounds when full). */
  seats: number;
  creator: string;
  createdAt: number;
  members: CircleMember[];
}

export interface CircleStore {
  create(c: StoredCircle): Promise<void>;
  get(id: string): Promise<StoredCircle | null>;
  update(id: string, fn: (c: StoredCircle) => StoredCircle): Promise<StoredCircle | null>;
  list(): Promise<StoredCircle[]>;
}

const KEY = (id: string) => `circle:${id}`;
const INDEX = "circles";

function upstashStore(redis: Redis): CircleStore {
  return {
    async create(c) {
      await redis.set(KEY(c.id), c);
      await redis.sadd(INDEX, c.id);
    },
    async get(id) {
      return (await redis.get<StoredCircle>(KEY(id))) ?? null;
    },
    async update(id, fn) {
      const current = await redis.get<StoredCircle>(KEY(id));
      if (!current) return null;
      const next = fn(current);
      await redis.set(KEY(id), next);
      return next;
    },
    async list() {
      const ids = await redis.smembers(INDEX);
      if (!ids.length) return [];
      const all = await Promise.all(ids.map((id) => redis.get<StoredCircle>(KEY(id))));
      return all.filter((c): c is StoredCircle => !!c);
    },
  };
}

function memoryStore(): CircleStore {
  // Module-level map: persists across requests within a single dev process.
  const g = globalThis as unknown as { __susuCircles?: Map<string, StoredCircle> };
  const map = (g.__susuCircles ??= new Map<string, StoredCircle>());
  return {
    async create(c) {
      map.set(c.id, c);
    },
    async get(id) {
      return map.get(id) ?? null;
    },
    async update(id, fn) {
      const current = map.get(id);
      if (!current) return null;
      const next = fn(current);
      map.set(id, next);
      return next;
    },
    async list() {
      return [...map.values()];
    },
  };
}

function pickEnv(suffix: RegExp): string | undefined {
  const key = Object.keys(process.env).find((k) => suffix.test(k) && process.env[k]);
  return key ? process.env[key] : undefined;
}

/**
 * Resolve Upstash REST creds. Handles the explicit names plus any prefix Vercel's
 * Upstash integration applies (e.g. STORAGE_KV_REST_API_URL), so the "Custom
 * Prefix" chosen when connecting the database doesn't matter.
 */
function resolveUpstashCreds(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    pickEnv(/(_REST_API_URL|_REST_URL)$/);
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    pickEnv(/(_REST_API_TOKEN|_REST_URL_TOKEN|_REST_TOKEN)$/);
  return url && token ? { url, token } : null;
}

function makeStore(): CircleStore {
  const creds = resolveUpstashCreds();
  if (creds) return upstashStore(new Redis(creds));
  if (process.env.NODE_ENV === "production") {
    console.warn("[susu] No Upstash credentials found — circles will NOT persist across serverless invocations.");
  }
  return memoryStore();
}

export const store: CircleStore = makeStore();
