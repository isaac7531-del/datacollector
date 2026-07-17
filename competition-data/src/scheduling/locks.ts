import type { CompetitionDataRepository } from "../adapters/repository";
import type { SchedulerLock } from "../domain/records";

export class SchedulerLockService {
  constructor(private readonly repository: CompetitionDataRepository) {}

  async withLock<T>(scope: string, ttlMs: number, fn: () => Promise<T>): Promise<T | undefined> {
    const lock: SchedulerLock = {
      id: `lock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      scope,
      ownerId: process.pid ? `pid-${process.pid}` : "unknown",
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMs).toISOString()
    };

    const acquired = (await this.repository.acquireSchedulerLock?.(lock)) ?? true;
    if (!acquired) {
      return undefined;
    }

    try {
      return await fn();
    } finally {
      await this.repository.releaseSchedulerLock?.(lock.id);
    }
  }
}
