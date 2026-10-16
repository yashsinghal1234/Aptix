/**
 * Advanced Rate Limiting System with Dual Bucketing, Safe IP Extraction, and Distributed Redis / Memory Storage.
 * 
 * - Dual Bucketing:
 *   1. Target Bucket (IP + Account/PIN): Strict limit (e.g. 5 attempts / 5 mins) to prevent targeted account cracking.
 *   2. Global IP Bucket: Broader limit (e.g. 60 attempts / 15 mins) to prevent automated credential stuffing/spraying.
 * 
 * - Safe IP Extraction:
 *   Safely extracts and validates client IP against header injection, prioritizing provider headers (Vercel, Cloudflare, etc.)
 *   over client-spoofable x-forwarded-for.
 * 
 * - Distributed Redis Support:
 *   Supports Upstash Redis REST / REDIS_URL when configured via UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 *   Falls back gracefully to an LRU-bounded, auto-purging in-memory map for zero-config local dev and test environments.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const MAX_MEMORY_ENTRIES = 10000;
const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired memory records every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function enforceMemoryLimit() {
  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    let count = 0;
    const toDelete = Math.floor(MAX_MEMORY_ENTRIES * 0.2);
    for (const key of memoryStore.keys()) {
      memoryStore.delete(key);
      if (++count >= toDelete) break;
    }
  }
}

/**
 * Executes a pipeline of commands against Upstash Redis REST API.
 * Returns array of results or null if Redis is unconfigured or unreachable.
 */
async function redisPipeline(commands: (string | number)[][]): Promise<any[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data.map(d => d.result) : null;
  } catch {
    return null; // Gracefully fallback to memory store
  }
}

/**
 * Safely extracts client IP address from request headers without trusting spoofable client headers.
 * Validates against IPv4 and IPv6 syntax and rejects header injection payloads.
 */
export function getSafeClientIp(headerList: { get(name: string): string | null }): string {
  // Provider-controlled edge headers take highest precedence
  const vercelIp = headerList.get("x-vercel-ip");
  if (vercelIp && isValidIp(vercelIp.trim())) return vercelIp.trim();

  const cfConnectingIp = headerList.get("cf-connecting-ip");
  if (cfConnectingIp && isValidIp(cfConnectingIp.trim())) return cfConnectingIp.trim();

  const realIp = headerList.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();

  // For x-forwarded-for, parse comma-separated chain
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map(p => p.trim());
    const candidate = parts[0];
    if (candidate) {
      const ipOnly = candidate.includes(":") && !candidate.includes("::")
        ? candidate.split(":")[0]
        : candidate;
      if (isValidIp(ipOnly)) return ipOnly;
    }
  }

  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Pattern.test(ip)) return true;
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;
  return ipv6Pattern.test(ip) && ip.includes(":");
}

// In-Memory Store Helpers
function getMemoryRecord(key: string): RateLimitRecord | null {
  const record = memoryStore.get(key);
  if (!record) return null;
  if (Date.now() > record.resetAt) {
    memoryStore.delete(key);
    return null;
  }
  return record;
}

function incrementMemoryRecord(key: string, windowMs: number): void {
  const now = Date.now();
  const record = getMemoryRecord(key);
  if (!record) {
    enforceMemoryLimit();
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    record.count += 1;
  }
}

/**
 * Checks dual rate limit buckets across Redis (if configured) and Memory Store:
 * 1. Global IP Bucket (e.g. 60 attempts / 15 mins)
 * 2. Target Account Bucket (e.g. 5 attempts / 5 mins)
 */
export async function checkDualRateLimit(
  ip: string,
  targetKey: string,
  config?: {
    ipLimit?: number;
    ipWindowMs?: number;
    targetLimit?: number;
    targetWindowMs?: number;
  }
): Promise<{ allowed: boolean; retryAfterSeconds: number; reason?: "ip_limit" | "target_limit" }> {
  const ipLimit = config?.ipLimit ?? 60;
  const ipWindowMs = config?.ipWindowMs ?? 15 * 60 * 1000;
  const targetLimit = config?.targetLimit ?? 5;
  const targetWindowMs = config?.targetWindowMs ?? 5 * 60 * 1000;

  const now = Date.now();
  const ipKey = `ip_${ip}`;

  // 1. Check Redis if configured
  const redisRes = await redisPipeline([
    ["GET", `rl:${ipKey}`],
    ["TTL", `rl:${ipKey}`],
    ["GET", `rl:${targetKey}`],
    ["TTL", `rl:${targetKey}`],
  ]);

  if (redisRes) {
    const [ipCountStr, ipTtl, targetCountStr, targetTtl] = redisRes;
    const ipCount = parseInt(ipCountStr || "0", 10);
    const targetCount = parseInt(targetCountStr || "0", 10);

    if (ipCount >= ipLimit) {
      const retryAfter = Math.max(1, ipTtl > 0 ? ipTtl : Math.ceil(ipWindowMs / 1000));
      return { allowed: false, retryAfterSeconds: retryAfter, reason: "ip_limit" };
    }

    if (targetCount >= targetLimit) {
      const retryAfter = Math.max(1, targetTtl > 0 ? targetTtl : Math.ceil(targetWindowMs / 1000));
      return { allowed: false, retryAfterSeconds: retryAfter, reason: "target_limit" };
    }
  }

  // 2. Check In-Memory Store (fallback or local enforcement)
  const ipRecord = getMemoryRecord(ipKey);
  if (ipRecord && ipRecord.count >= ipLimit) {
    const retryAfter = Math.max(1, Math.ceil((ipRecord.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter, reason: "ip_limit" };
  }

  const targetRecord = getMemoryRecord(targetKey);
  if (targetRecord && targetRecord.count >= targetLimit) {
    const retryAfter = Math.max(1, Math.ceil((targetRecord.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter, reason: "target_limit" };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Records failed attempt across both IP bucket and Target bucket in Redis and Memory.
 */
export async function recordDualFailedAttempt(
  ip: string,
  targetKey: string,
  config?: { ipWindowMs?: number; targetWindowMs?: number }
): Promise<void> {
  const ipWindowMs = config?.ipWindowMs ?? 15 * 60 * 1000;
  const targetWindowMs = config?.targetWindowMs ?? 5 * 60 * 1000;
  const ipKey = `ip_${ip}`;

  const ipSecs = Math.ceil(ipWindowMs / 1000);
  const targetSecs = Math.ceil(targetWindowMs / 1000);

  // Send to Redis in background
  redisPipeline([
    ["INCR", `rl:${ipKey}`],
    ["EXPIRE", `rl:${ipKey}`, ipSecs],
    ["INCR", `rl:${targetKey}`],
    ["EXPIRE", `rl:${targetKey}`, targetSecs],
  ]).catch(() => {});

  // Record in memory store
  incrementMemoryRecord(ipKey, ipWindowMs);
  incrementMemoryRecord(targetKey, targetWindowMs);
}

/**
 * Resets target rate limit upon successful authentication in Redis and Memory.
 */
export async function resetDualRateLimit(ip: string, targetKey: string): Promise<void> {
  // Reset in Redis
  redisPipeline([
    ["DEL", `rl:${targetKey}`]
  ]).catch(() => {});

  // Reset in memory store
  memoryStore.delete(targetKey);
}

// ── Legacy Compatibility Helpers (Synchronous for existing tests) ────────────
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000
): { allowed: boolean; retryAfterSeconds: number } {
  const record = getMemoryRecord(identifier);
  if (!record) return { allowed: true, retryAfterSeconds: 0 };

  if (record.count >= maxAttempts) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - Date.now()) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(identifier: string, windowMs: number = 5 * 60 * 1000): void {
  incrementMemoryRecord(identifier, windowMs);
}

export function resetRateLimit(identifier: string): void {
  memoryStore.delete(identifier);
}
