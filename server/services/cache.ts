type CacheEntry<T> = { value: T; expiresAt: number };

export class InMemoryCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private defaultTtlMs = 15 * 60 * 1000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const aiResponseCache = new InMemoryCache<any>(15 * 60 * 1000);


