// Leave 30 seconds below the hosting limit for runtime and response overhead.
export const AR24_CRON_BUDGET_MS = 90_000
export const AR24_POLL_LIMIT_MS = 15_000
export const AR24_IO_LIMIT_MS = 10_000

export class AR24BudgetError extends Error {
  constructor() { super('AR24 operation time budget exhausted'); this.name = 'AR24BudgetError' }
}

/** Bounds every awaited operation, even if a dependency ignores its abort signal.
 * A timed-out write has an unknown outcome; callers must not report it as confirmed. */
export function createAR24Budget() {
  const deadline = performance.now() + AR24_CRON_BUDGET_MS
  const remaining = () => Math.max(0, Math.floor(deadline - performance.now()))
  return {
    remaining,
    async run<T>(operation: (signal: AbortSignal) => PromiseLike<T>, limitMs = AR24_IO_LIMIT_MS): Promise<T> {
      const timeoutMs = Math.min(remaining(), limitMs)
      if (timeoutMs <= 0) throw new AR24BudgetError()
      const controller = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new AR24BudgetError())
        }, timeoutMs)
      })
      try {
        const result = await Promise.race([Promise.resolve().then(() => operation(controller.signal)), timeout])
        if (remaining() <= 0) throw new AR24BudgetError()
        return result
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
