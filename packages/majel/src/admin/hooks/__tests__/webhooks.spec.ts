import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithClient } from './utils'

vi.mock('../../lib/sdk', () => ({
	sdk: { client: { fetch: vi.fn() } }
}))

import { sdk } from '../../lib/sdk'
import {
	useWebhookTriggersList,
	useWebhookTrigger,
	useWebhookActions,
	useWebhookAction,
	useWebhookDeliveries,
	useWebhookReceipts,
	useWebhookSecrets
} from '../webhooks'

const mockFetch = sdk.client.fetch as ReturnType<typeof vi.fn>

beforeEach(() => { mockFetch.mockReset() })

describe('useWebhookTriggersList', () => {
	it('fetches triggers with params', async () => {
		const response = { triggers: [{ id: 'trig_1', name: 'Test' }], count: 1, limit: 15, offset: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookTriggersList({ limit: 15, offset: 0 }))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/webhook-triggers', { query: { limit: 15, offset: 0 } })
	})

	it('is in loading state initially', () => {
		mockFetch.mockResolvedValue({ triggers: [], count: 0 })
		const { result } = renderHookWithClient(() => useWebhookTriggersList({ limit: 15, offset: 0 }))
		expect(result.current.isLoading).toBe(true)
	})
})

describe('useWebhookTrigger', () => {
	it('fetches a single trigger by id', async () => {
		const response = { trigger: { id: 'trig_1', name: 'My Trigger' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookTrigger('trig_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/webhook-triggers/trig_1')
	})

	it('does not fetch when id is undefined', () => {
		const { result } = renderHookWithClient(() => useWebhookTrigger(undefined))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useWebhookActions', () => {
	it('fetches actions for a trigger', async () => {
		const response = { actions: [{ id: 'act_1' }], count: 1 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookActions('trig_1', { limit: 50, offset: 0 }))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/webhook-triggers/trig_1/actions', { query: { limit: 50, offset: 0 } })
	})
})

describe('useWebhookAction', () => {
	it('fetches a single action', async () => {
		const response = { action: { id: 'act_1', name: 'My Action' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookAction('trig_1', 'act_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
	})

	it('does not fetch when either id is undefined', () => {
		const { result } = renderHookWithClient(() => useWebhookAction(undefined, 'act_1'))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useWebhookDeliveries', () => {
	it('fetches deliveries for an action', async () => {
		const response = { deliveries: [], count: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookDeliveries('trig_1', 'act_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(mockFetch).toHaveBeenCalledWith(
			'/admin/webhook-triggers/trig_1/actions/act_1/deliveries',
			{ query: { limit: 10, offset: 0 } }
		)
	})
})

describe('useWebhookReceipts', () => {
	it('fetches receipts when enabled', async () => {
		const response = { receipts: [], count: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookReceipts('trig_1', true))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(mockFetch).toHaveBeenCalledWith(
			'/admin/webhook-triggers/trig_1/receipts',
			{ query: { limit: 10, offset: 0 } }
		)
	})

	it('does not fetch when disabled', () => {
		const { result } = renderHookWithClient(() => useWebhookReceipts('trig_1', false))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useWebhookSecrets', () => {
	it('fetches secrets when enabled', async () => {
		const response = { secrets: [{ id: 'sec_1', name: 'My Secret' }] }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useWebhookSecrets(true))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/webhook-secrets')
	})

	it('does not fetch when disabled', () => {
		const { result } = renderHookWithClient(() => useWebhookSecrets(false))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})
