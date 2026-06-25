// In-memory signature dedup cache for replay-protection within the tolerance
// window. Activates when a trigger has timestamp_header + tolerance_seconds
// set — without those, there's no defined window to protect.
//
// Caveat: per-process. Multi-worker deployments will have one cache per
// worker, so a captured request can be replayed up to N times where N is the
// worker count. The timestamp+tolerance check still rejects replays outside
// the window. For tighter multi-worker guarantees, swap this for a Redis-
// backed implementation.

type Entry = { expiresAt: number }

export class SignatureCache {
	private readonly entries = new Map<string, Entry>()
	private lastSweep = 0
	private readonly sweepIntervalMs: number
	private readonly maxEntries: number

	constructor(sweepIntervalMs = 60_000, maxEntries = 10_000) {
		this.sweepIntervalMs = sweepIntervalMs
		this.maxEntries = maxEntries
	}

	/**
	 * Returns true if the signature was already seen within its window
	 * (i.e. this is a replay). Otherwise records it and returns false.
	 *
	 * triggerId is folded into the key so two different triggers can use the
	 * same signing key and not collide.
	 */
	checkAndRecord(triggerId: string, signature: string, ttlSeconds: number): boolean {
		const now = Date.now()
		this.sweepIfDue(now)

		const key = `${triggerId}:${signature}`
		const existing = this.entries.get(key)
		if (existing && existing.expiresAt > now) {
			return true
		}

		// Bound memory: if we hit the cap, drop the oldest entry (insertion
		// order = roughly oldest-first since we always set fresh).
		if (this.entries.size >= this.maxEntries) {
			const firstKey = this.entries.keys().next().value
			if (firstKey !== undefined) this.entries.delete(firstKey)
		}

		this.entries.set(key, { expiresAt: now + ttlSeconds * 1000 })
		return false
	}

	/** Test-only: current entry count. */
	size(): number {
		return this.entries.size
	}

	/** Test-only: wipe all state. */
	clear(): void {
		this.entries.clear()
		this.lastSweep = 0
	}

	private sweepIfDue(now: number): void {
		if (now - this.lastSweep < this.sweepIntervalMs) return
		this.lastSweep = now
		for (const [k, v] of this.entries) {
			if (v.expiresAt <= now) this.entries.delete(k)
		}
	}
}
