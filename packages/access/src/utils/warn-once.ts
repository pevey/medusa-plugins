/**
 * Warn-once state for configuration gaps the guard detects per request.
 *
 * The sets re-arm when the registry behind them changes: registering a scope or
 * an actor resolver is the act of fixing one of these gaps, so a process-lifetime
 * set would leave a fixed configuration indistinguishable from an unfixed one
 * until restart.
 *
 * A leaf module because the warnings are emitted from the guard and re-armed
 * from registries the guard imports — the state cannot live in either.
 */
export type WarnBucket = 'actor-type' | 'unenforceable-scope' | 'non-canonical-scope'

const buckets = new Map<WarnBucket, Set<string>>()

function bucketFor(bucket: WarnBucket): Set<string> {
	let keys = buckets.get(bucket)
	if (!keys) {
		keys = new Set()
		buckets.set(bucket, keys)
	}
	return keys
}

/** Whether this key has already been warned about since the last re-arm. */
export function alreadyWarned(bucket: WarnBucket, key: string): boolean {
	return bucketFor(bucket).has(key)
}

export function markWarned(bucket: WarnBucket, key: string): void {
	bucketFor(bucket).add(key)
}

/** Let every key in this bucket warn again — its registry has changed. */
export function rearmWarnings(bucket: WarnBucket): void {
	bucketFor(bucket).clear()
}
