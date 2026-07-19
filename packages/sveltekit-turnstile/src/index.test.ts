import { describe, it, expect, vi, afterEach } from 'vitest'
import validateToken from './lib/validateToken.js'
import getClearance from './lib/getClearance.js'

describe('validateToken', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('POSTs the token and secret to siteverify and returns success', async () => {
		const fetchMock = vi.fn(async () => ({ json: async () => ({ success: true }) }))
		vi.stubGlobal('fetch', fetchMock)

		const result = await validateToken('tok-123', 'secret-xyz')

		expect(result).toBe(true)
		expect(fetchMock).toHaveBeenCalledWith(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ response: 'tok-123', secret: 'secret-xyz' })
			})
		)
	})

	it('returns false when verification fails', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ success: false }) })))
		expect(await validateToken('bad', 'secret')).toBe(false)
	})
})

describe('getClearance', () => {
	it('rejects when called outside a browser', async () => {
		// vitest default environment is node: `window` is undefined here.
		await expect(getClearance('site-key')).rejects.toThrow('can only be called in the browser')
	})
})
