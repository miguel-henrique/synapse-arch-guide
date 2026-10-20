import { useCallback, useEffect, useState } from 'react';

// Persisted set of doc ids the reader has marked complete.
const STORAGE_KEY = 'sag_docs_read_v1';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function save(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable — progress is best-effort */
  }
}

export function useReadingProgress() {
  const [read, setRead] = useState<Set<string>>(() => load());

  // Keep in sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setRead(load());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isRead = useCallback((id: string) => read.has(id), [read]);

  const toggle = useCallback((id: string) => {
    setRead(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      save(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setRead(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setRead(() => {
      const next = new Set<string>();
      save(next);
      return next;
    });
  }, []);

  return { read, isRead, toggle, markRead, reset, count: read.size };
}
