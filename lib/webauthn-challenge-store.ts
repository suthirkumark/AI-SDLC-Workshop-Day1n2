type ChallengeType = "registration" | "authentication";

interface ChallengeRecord {
  challenge: string;
  expiresAt: number;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const store = new Map<string, ChallengeRecord>();

function buildKey(type: ChallengeType, username: string): string {
  return `${type}:${username.toLowerCase()}`;
}

function pruneExpired(now: number): void {
  for (const [key, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function saveChallenge(
  type: ChallengeType,
  username: string,
  challenge: string
): void {
  const now = Date.now();
  pruneExpired(now);
  store.set(buildKey(type, username), {
    challenge,
    expiresAt: now + CHALLENGE_TTL_MS
  });
}

export function consumeChallenge(
  type: ChallengeType,
  username: string
): string | null {
  const now = Date.now();
  pruneExpired(now);

  const key = buildKey(type, username);
  const record = store.get(key);
  if (!record || record.expiresAt <= now) {
    store.delete(key);
    return null;
  }

  store.delete(key);
  return record.challenge;
}
