import { SignatureCache } from '../signature-cache'

describe('SignatureCache.checkAndRecord', () => {
	it('returns false on first sighting and true on replay within the window', () => {
		const cache = new SignatureCache()
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 60)).toBe(false)
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 60)).toBe(true)
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 60)).toBe(true)
	})

	it('allows the same signature once the TTL window has passed', async () => {
		const cache = new SignatureCache()
		// 1-second TTL keeps the test fast
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 1)).toBe(false)
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 1)).toBe(true)
		await new Promise(r => setTimeout(r, 1100))
		// Outside the window — should be accepted again, not flagged as replay.
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 1)).toBe(false)
	})

	it('namespaces by triggerId so different triggers with identical signatures do not collide', () => {
		const cache = new SignatureCache()
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 60)).toBe(false)
		expect(cache.checkAndRecord('trigger-2', 'sig-abc', 60)).toBe(false)
		expect(cache.checkAndRecord('trigger-1', 'sig-abc', 60)).toBe(true)
		expect(cache.checkAndRecord('trigger-2', 'sig-abc', 60)).toBe(true)
	})

	it('bounds memory via the maxEntries cap (evicts oldest)', () => {
		const cache = new SignatureCache(60_000, 3)
		cache.checkAndRecord('t', 'a', 60)
		cache.checkAndRecord('t', 'b', 60)
		cache.checkAndRecord('t', 'c', 60)
		expect(cache.size()).toBe(3)
		// 'b' and 'c' replays are detected — cache is at capacity but not stale.
		expect(cache.checkAndRecord('t', 'b', 60)).toBe(true)
		expect(cache.checkAndRecord('t', 'c', 60)).toBe(true)
		// 4th distinct insertion ('d') evicts the oldest entry ('a') to stay at cap.
		cache.checkAndRecord('t', 'd', 60)
		expect(cache.size()).toBe(3)
		// 'a' is gone, so the next sighting of 'a' looks fresh — NOT a replay.
		expect(cache.checkAndRecord('t', 'a', 60)).toBe(false)
		// 'd' is still cached, so its replay is detected.
		expect(cache.checkAndRecord('t', 'd', 60)).toBe(true)
	})
})
