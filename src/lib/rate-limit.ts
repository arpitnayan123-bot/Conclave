// Simple in-memory sliding-window rate limiter.
// Suitable for the single-node dev/preview deployment (no external cache needed).

type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();

// Periodically sweep stale buckets so the map does not grow unbounded.
let lastSweep = Date.now();
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs * 10);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

/**
 * Returns true when the action is allowed, false when the caller is over the limit.
 * @param key    unique bucket key, e.g. `submit:1.2.3.4` or `comment:<memberId>`
 * @param limit  max hits inside the window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return true;
}

/** Best-effort client IP from proxy headers (Caddy in front of Next). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    // Trust only the LAST hop — the value our own proxy appended. Earlier
    // entries come from the client and can be spoofed with a forged header.
    const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return req.headers.get("x-real-ip") ?? "local";
}
