import { useState, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds (default: 5 minutes)
  key?: string; // Cache key prefix
}

export const useLocalCache = <T,>(options: CacheOptions = {}) => {
  const { ttl = 5 * 60 * 1000, key = 'kommo' } = options; // 5 minutes default
  const [cacheKeys] = useState(new Set<string>());

  const setCache = useCallback((cacheKey: string, data: T, customTtl?: number) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: customTtl || ttl
    };
    
    const fullKey = `${key}-${cacheKey}`;
    localStorage.setItem(fullKey, JSON.stringify(entry));
    cacheKeys.add(fullKey);
  }, [key, ttl, cacheKeys]);

  const getCache = useCallback((cacheKey: string): T | null => {
    try {
      const fullKey = `${key}-${cacheKey}`;
      const cached = localStorage.getItem(fullKey);
      
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(fullKey);
        cacheKeys.delete(fullKey);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Error reading from cache:', error);
      return null;
    }
  }, [key, cacheKeys]);

  const clearCache = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      const fullKey = `${key}-${cacheKey}`;
      localStorage.removeItem(fullKey);
      cacheKeys.delete(fullKey);
    } else {
      // Clear all cache entries for this key prefix
      cacheKeys.forEach(fullKey => {
        localStorage.removeItem(fullKey);
      });
      cacheKeys.clear();
    }
  }, [key, cacheKeys]);

  const isCached = useCallback((cacheKey: string): boolean => {
    return getCache(cacheKey) !== null;
  }, [getCache]);

  return {
    setCache,
    getCache,
    clearCache,
    isCached
  };
};