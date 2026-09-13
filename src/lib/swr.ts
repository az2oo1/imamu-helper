'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Fetcher<T> = (url: string) => Promise<T>;

interface SWROptions<T> {
  revalidateOnFocus?: boolean;
  dedupingInterval?: number; // ms to dedupe requests (default: 2000)
  fallbackData?: T;
  persistKey?: string; // If set, cache in sessionStorage for instant rehydration
}

interface CacheEntry<T> {
  data: T | undefined;
  error: any;
  timestamp: number;
  inFlightPromise?: Promise<T>;
}

// Global in-memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

// Global listeners for mutate events
const listeners = new Map<string, Set<(data: any) => void>>();

function getPersisted<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(`swr_${key}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch (_e) {
    return undefined;
  }
}

function setPersisted<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`swr_${key}`, JSON.stringify(data));
  } catch (_e) {}
}

const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err: any = new Error(`Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

/**
 * Global mutate function to update cache and re-render all listening components
 */
export async function mutate<T = any>(
  key: string,
  dataOrPromise?: T | Promise<T> | ((current: T | undefined) => T),
  shouldRevalidate: boolean = true
): Promise<T | undefined> {
  let entry = memoryCache.get(key);
  if (!entry) {
    entry = { data: undefined, error: null, timestamp: 0 };
    memoryCache.set(key, entry);
  }

  if (typeof dataOrPromise !== 'undefined') {
    let resolvedData: T;
    if (typeof dataOrPromise === 'function') {
      resolvedData = (dataOrPromise as any)(entry.data);
    } else if (dataOrPromise instanceof Promise) {
      resolvedData = await dataOrPromise;
    } else {
      resolvedData = dataOrPromise;
    }

    entry.data = resolvedData;
    entry.timestamp = Date.now();
    setPersisted(key, resolvedData);

    // Notify all active hooks listening on this key
    const subs = listeners.get(key);
    if (subs) {
      subs.forEach((cb) => cb(resolvedData));
    }
  }

  if (shouldRevalidate) {
    try {
      const freshData = await defaultFetcher(key);
      entry.data = freshData;
      entry.timestamp = Date.now();
      setPersisted(key, freshData);
      const subs = listeners.get(key);
      if (subs) {
        subs.forEach((cb) => cb(freshData));
      }
      return freshData;
    } catch (_e) {}
  }

  return entry.data;
}

/**
 * Lightweight, zero-dependency Stale-While-Revalidate (SWR) hook
 */
export function useSWR<T = any>(
  key: string | null | undefined,
  fetcher: Fetcher<T> = defaultFetcher,
  options: SWROptions<T> = {}
) {
  const {
    revalidateOnFocus = true,
    dedupingInterval = 2500,
    fallbackData,
    persistKey,
  } = options;

  const storageKey = persistKey || (key ? key.replace(/[^\w-]/g, '_') : '');

  // Initialize from memory or sessionStorage
  const getInitialData = (): T | undefined => {
    if (!key) return undefined;
    const entry = memoryCache.get(key);
    if (entry?.data !== undefined) return entry.data;
    if (storageKey) {
      const persisted = getPersisted<T>(storageKey);
      if (persisted !== undefined) return persisted;
    }
    return fallbackData;
  };

  const [data, setData] = useState<T | undefined>(getInitialData);
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !getInitialData() && !!key);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const executeFetch = useCallback(async (isMounted: () => boolean) => {
    if (!key) return;

    let entry = memoryCache.get(key);
    const now = Date.now();

    // Request Deduplication: if an identical request is in-flight, await it
    if (entry?.inFlightPromise) {
      try {
        const sharedData = await entry.inFlightPromise;
        if (isMounted()) {
          setData(sharedData);
          setIsLoading(false);
          setIsValidating(false);
        }
        return;
      } catch (err) {
        if (isMounted()) {
          setError(err);
          setIsLoading(false);
          setIsValidating(false);
        }
        return;
      }
    }

    // Deduplication interval: if freshly fetched within dedupingInterval, skip network
    if (entry?.data !== undefined && now - entry.timestamp < dedupingInterval) {
      if (isMounted()) {
        setData(entry.data);
        setIsLoading(false);
        setIsValidating(false);
      }
      return;
    }

    if (entry?.data === undefined) {
      setIsLoading(true);
    }
    setIsValidating(true);

    const promise = fetcherRef.current(key);

    if (!entry) {
      entry = { data: undefined, error: null, timestamp: 0 };
      memoryCache.set(key, entry);
    }
    entry.inFlightPromise = promise;

    try {
      const result = await promise;
      entry.data = result;
      entry.error = null;
      entry.timestamp = Date.now();
      entry.inFlightPromise = undefined;

      if (storageKey) {
        setPersisted(storageKey, result);
      }

      if (isMounted()) {
        setData(result);
        setError(null);
      }

      // Notify other components using this key
      const subs = listeners.get(key);
      if (subs) {
        subs.forEach((cb) => cb(result));
      }
    } catch (err) {
      entry.error = err;
      entry.inFlightPromise = undefined;
      if (isMounted()) {
        setError(err);
      }
    } finally {
      if (isMounted()) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [key, dedupingInterval, storageKey]);

  useEffect(() => {
    if (!key) return;

    let isMounted = true;
    const checkMounted = () => isMounted;

    // Register listener for external mutate calls
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    const updateListener = (nextData: T) => {
      if (isMounted) setData(nextData);
    };
    listeners.get(key)!.add(updateListener);

    executeFetch(checkMounted);

    // Revalidate on focus
    const handleFocus = () => {
      if (revalidateOnFocus && isMounted) {
        executeFetch(checkMounted);
      }
    };

    if (revalidateOnFocus && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleFocus);
    }

    return () => {
      isMounted = false;
      listeners.get(key)?.delete(updateListener);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleFocus);
      }
    };
  }, [key, executeFetch, revalidateOnFocus]);

  const boundMutate = useCallback(
    (dataOrPromise?: T | Promise<T> | ((current: T | undefined) => T), shouldRevalidate: boolean = true) => {
      if (!key) return Promise.resolve(undefined);
      return mutate<T>(key, dataOrPromise, shouldRevalidate);
    },
    [key]
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: boundMutate,
  };
}
