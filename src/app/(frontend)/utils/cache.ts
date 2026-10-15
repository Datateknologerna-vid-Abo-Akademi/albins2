const CACHE_PREFIX = 'albins:';

type CacheKey = string;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const hasStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

export const CACHE_KEYS = {
  categories: 'categories',
} as const;

export const setCache = <T>(key: CacheKey, data: T) => {
  if (!hasStorage()) return;

  try {
    const payload: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
};

export const getCache = <T>(key: CacheKey, maxAgeMs: number): T | null => {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const payload = JSON.parse(raw) as CacheEntry<T>;
    if (!payload || typeof payload.timestamp !== 'number') {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    if (Date.now() - payload.timestamp > maxAgeMs) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
};

export const clearCache = (keys?: CacheKey[]) => {
  if (!hasStorage()) return;

  const targets = keys ?? Object.values(CACHE_KEYS);
  targets.forEach((key) => {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  });
};
