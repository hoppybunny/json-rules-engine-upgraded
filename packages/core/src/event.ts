type Listener = (...args: unknown[]) => void | Promise<void>;

/**
 * A minimal async-aware event emitter. We avoid `node:events` so the package
 * runs in browsers without polyfills. Handlers may be synchronous or return
 * a Promise; emitAsync awaits every handler and rejects on the first throw.
 */
export class TinyEmitter<TMap extends { [K in keyof TMap]: (...args: any[]) => unknown }> {
  readonly #listeners = new Map<keyof TMap, Set<Listener>>();

  on<K extends keyof TMap>(event: K, listener: TMap[K]): this {
    let bucket = this.#listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.#listeners.set(event, bucket);
    }
    bucket.add(listener as Listener);
    return this;
  }

  off<K extends keyof TMap>(event: K, listener: TMap[K]): this {
    this.#listeners.get(event)?.delete(listener as Listener);
    return this;
  }

  removeAllListeners<K extends keyof TMap>(event?: K): this {
    if (event !== undefined) this.#listeners.delete(event);
    else this.#listeners.clear();
    return this;
  }

  listenerCount<K extends keyof TMap>(event: K): number {
    return this.#listeners.get(event)?.size ?? 0;
  }

  async emitAsync<K extends keyof TMap>(event: K, ...args: Parameters<TMap[K]>): Promise<void> {
    const bucket = this.#listeners.get(event);
    if (!bucket || bucket.size === 0) return;
    for (const l of [...bucket]) {
      await l(...args);
    }
  }
}
