/**
 * localStorage 기반 캐싱 유틸
 * storage.js 추상화 레이어를 통해 접근
 */
import { storage } from './storage.js';

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7일
const CACHE_PREFIX = 'cache_';

export function getCached(key) {
  try {
    const raw = storage.get(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const { data, timestamp, ttl } = raw;
    if (Date.now() - timestamp > (ttl || DEFAULT_TTL)) {
      storage.remove(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  storage.set(`${CACHE_PREFIX}${key}`, { data, timestamp: Date.now(), ttl });
}

export function clearCache(keyPrefix) {
  // storage 추상화에 iteration API가 없으므로 localStorage 직접 접근
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(`${CACHE_PREFIX}${keyPrefix || ''}`)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
