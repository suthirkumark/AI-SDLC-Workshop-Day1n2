interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): boolean {
  const now = Date.now();

  for (const [bucketKey, entry] of buckets.entries()) {
    if (entry.expiresAt <= now) {
      buckets.delete(bucketKey);
    }
  }

  const entry = buckets.get(input.key);
  if (!entry || entry.expiresAt <= now) {
    buckets.set(input.key, {
      count: 1,
      expiresAt: now + input.windowMs
    });
    return true;
  }

  if (entry.count >= input.limit) {
    return false;
  }

  buckets.set(input.key, {
    ...entry,
    count: entry.count + 1
  });

  return true;
}
