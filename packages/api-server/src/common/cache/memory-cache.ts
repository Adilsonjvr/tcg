type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class MemoryCache<T> {
  private readonly ttl: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  async getOrSet(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached) {
      return cached;
    }

    const value = await factory();
    this.set(key, value);
    return value;
  }
}
