/**
 * 스토리지 추상화 레이어
 * 현재: localStorage
 * 향후: IndexedDB, SQLite(네이티브), 클라우드 DB로 교체 시 이 파일만 수정
 */
export const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch {
      return localStorage.getItem(key);
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },
};
