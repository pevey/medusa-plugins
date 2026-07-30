import { describe, it, expect } from 'vitest'

describe('harness environment', () => {
	it('runs in a real browser', () => {
		expect(typeof window).toBe('object')
		expect(typeof document.createElement('div').getBoundingClientRect).toBe('function')
	})
})
