/// <reference types="jest" />
import { BraintreeProvider } from '../provider'
import type { BraintreeOptions } from '../types'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCaching = {
	get: jest.fn(),
	set: jest.fn(),
	clear: jest.fn()
}

const mockGateway = {
	clientToken: {
		generate: jest.fn().mockResolvedValue({ clientToken: 'generated-token-123' })
	}
}

const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn()
}

const defaultOptions: BraintreeOptions = {
	environment: 'sandbox',
	merchantId: 'test-merchant',
	publicKey: 'test-public',
	privateKey: 'test-private',
	webhookSecret: 'test-secret',
	enable3DSecure: false,
	savePaymentMethod: false,
	autoCapture: false
}

function createProvider(): BraintreeProvider {
	const container = {
		logger: mockLogger,
		caching: mockCaching
	}
	const provider = new BraintreeProvider(container, defaultOptions)
	// Replace the real gateway with our mock
	;(provider as any).gateway = mockGateway
	return provider
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BraintreeProvider caching', () => {
	let provider: BraintreeProvider

	beforeEach(() => {
		jest.clearAllMocks()
		provider = createProvider()
	})

	describe('saveClientTokenToCache', () => {
		it('stores token as { token } object with correct key and TTL', async () => {
			const now = Math.floor(Date.now() / 1000)
			const expiry = now + 3600 // 1 hour from now

			await provider.saveClientTokenToCache('tok_abc', 'cus_123', expiry)

			expect(mockCaching.set).toHaveBeenCalledTimes(1)
			const call = mockCaching.set.mock.calls[0][0]
			expect(call.key).toBe('braintree:clientToken:cus_123')
			expect(call.data).toEqual({ token: 'tok_abc' })
			expect(call.ttl).toBeGreaterThan(0)
			expect(call.ttl).toBeLessThanOrEqual(3600)
		})

		it('does not cache when TTL would be <= 0', async () => {
			const expired = Math.floor(Date.now() / 1000) - 10

			await provider.saveClientTokenToCache('tok_abc', 'cus_123', expired)

			expect(mockCaching.set).not.toHaveBeenCalled()
		})

		it('does not cache when clientToken is empty', async () => {
			const expiry = Math.floor(Date.now() / 1000) + 3600

			await provider.saveClientTokenToCache('', 'cus_123', expiry)

			expect(mockCaching.set).not.toHaveBeenCalled()
		})

		it('throws when customerId is missing', async () => {
			const expiry = Math.floor(Date.now() / 1000) + 3600

			await expect(
				provider.saveClientTokenToCache('tok_abc', '', expiry)
			).rejects.toThrow('Customer ID is required')
		})
	})

	describe('getClientTokenFromCache', () => {
		it('returns the cached token string when found', async () => {
			mockCaching.get.mockResolvedValueOnce({ token: 'cached-tok' })

			const result = await provider.getClientTokenFromCache('cus_123')

			expect(mockCaching.get).toHaveBeenCalledWith({ key: 'braintree:clientToken:cus_123' })
			expect(result).toBe('cached-tok')
		})

		it('returns null when cache misses', async () => {
			mockCaching.get.mockResolvedValueOnce(null)

			const result = await provider.getClientTokenFromCache('cus_123')

			expect(result).toBeNull()
		})
	})

	describe('getValidClientToken', () => {
		it('returns cached token without generating a new one', async () => {
			mockCaching.get.mockResolvedValueOnce({ token: 'cached-tok' })

			const result = await provider.getValidClientToken('cus_123', undefined)

			expect(result).toBe('cached-tok')
			expect(mockGateway.clientToken.generate).not.toHaveBeenCalled()
		})

		it('generates and caches a new token on cache miss', async () => {
			mockCaching.get.mockResolvedValueOnce(null)

			const result = await provider.getValidClientToken('cus_123', undefined)

			expect(result).toBe('generated-token-123')
			expect(mockGateway.clientToken.generate).toHaveBeenCalledTimes(1)
			expect(mockCaching.set).toHaveBeenCalledTimes(1)

			const setCall = mockCaching.set.mock.calls[0][0]
			expect(setCall.key).toBe('braintree:clientToken:cus_123')
			expect(setCall.data).toEqual({ token: 'generated-token-123' })
			expect(setCall.ttl).toBeGreaterThan(0)
		})

		it('generates token without caching when no customerId', async () => {
			const result = await provider.getValidClientToken(undefined, undefined)

			expect(result).toBe('generated-token-123')
			expect(mockCaching.get).not.toHaveBeenCalled()
			expect(mockCaching.set).not.toHaveBeenCalled()
		})
	})
})
