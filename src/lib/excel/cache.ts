/**
 * Cache management for Excel data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ExcelCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) {
    // Default 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const stats: Record<
      string,
      { age: number; ttl: number; expired: boolean }
    > = {};

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      stats[key] = {
        age,
        ttl: entry.ttl,
        expired: age > entry.ttl,
      };
    });

    return stats;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    });

    return removed;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const excelCache = new ExcelCache(
  parseInt(process.env.EXCEL_CACHE_TTL || "300000", 10)
);
