import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithClient } from './utils'

vi.mock('../../lib/sdk', () => ({
	sdk: { client: { fetch: vi.fn() } }
}))

import { sdk } from '../../lib/sdk'
import {
	useAutomationTriggersList,
	useAutomationTrigger,
	useAutomationActions,
	useAutomationAction,
	useAutomationDeliveries,
	useAutomationReceipts,
	useAutomationSecrets
} from '../automations'

const mockFetch = sdk.client.fetch as ReturnType<typeof vi.fn>

beforeEach(() => { mockFetch.mockReset() })

describe('useAutomationTriggersList', () => {
	it('fetches triggers with params', async () => {
		const response = { triggers: [{ id: 'trig_1', name: 'Test' }], count: 1, limit: 15, offset: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationTriggersList({ limit: 15, offset: 0 }))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/automations', { query: { limit: 15, offset: 0 } })
	})

	it('is in loading state initially', () => {
		mockFetch.mockResolvedValue({ triggers: [], count: 0 })
		const { result } = renderHookWithClient(() => useAutomationTriggersList({ limit: 15, offset: 0 }))
		expect(result.current.isLoading).toBe(true)
	})
})

describe('useAutomationTrigger', () => {
	it('fetches a single trigger by id', async () => {
		const response = { trigger: { id: 'trig_1', name: 'My Trigger' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationTrigger('trig_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/automations/trig_1')
	})

	it('does not fetch when id is undefined', () => {
		const { result } = renderHookWithClient(() => useAutomationTrigger(undefined))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useAutomationActions', () => {
	it('fetches actions for a trigger', async () => {
		const response = { actions: [{ id: 'act_1' }], count: 1 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationActions('trig_1', { limit: 50, offset: 0 }))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/automations/trig_1/actions', { query: { limit: 50, offset: 0 } })
	})
})

describe('useAutomationAction', () => {
	it('fetches a single action', async () => {
		const response = { action: { id: 'act_1', name: 'My Action' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationAction('trig_1', 'act_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
	})

	it('does not fetch when either id is undefined', () => {
		const { result } = renderHookWithClient(() => useAutomationAction(undefined, 'act_1'))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useAutomationDeliveries', () => {
	it('fetches deliveries for an action', async () => {
		const response = { deliveries: [], count: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationDeliveries('trig_1', 'act_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(mockFetch).toHaveBeenCalledWith(
			'/admin/automations/trig_1/actions/act_1/deliveries',
			{ query: { limit: 10, offset: 0 } }
		)
	})
})

describe('useAutomationReceipts', () => {
	it('fetches receipts when enabled', async () => {
		const response = { receipts: [], count: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationReceipts('trig_1', true))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(mockFetch).toHaveBeenCalledWith(
			'/admin/automations/trig_1/receipts',
			{ query: { limit: 10, offset: 0 } }
		)
	})

	it('does not fetch when disabled', () => {
		const { result } = renderHookWithClient(() => useAutomationReceipts('trig_1', false))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useAutomationSecrets', () => {
	it('fetches secrets when enabled', async () => {
		const response = { secrets: [{ id: 'sec_1', name: 'My Secret' }] }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useAutomationSecrets(true))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/automations/secrets')
	})

	it('does not fetch when disabled', () => {
		const { result } = renderHookWithClient(() => useAutomationSecrets(false))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})
