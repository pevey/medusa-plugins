import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, act } from '@testing-library/react'
import { renderHookWithClient } from './utils'

vi.mock('../../lib/sdk', () => ({
	sdk: { client: { fetch: vi.fn() } }
}))

import { sdk } from '../../lib/sdk'
import { useOrderNotes, useCreateOrderNote, useDeleteOrderNote } from '../order-notes'

const mockFetch = sdk.client.fetch as ReturnType<typeof vi.fn>

beforeEach(() => { mockFetch.mockReset() })

// ─── useOrderNotes ────────────────────────────────────────────────────────────

describe('useOrderNotes', () => {
	it('fetches notes for an order', async () => {
		const response = {
			order_notes: [{ id: 'note_1', order_id: 'ord_1', note: 'Test note', sent: false }],
			count: 1,
			limit: 50,
			offset: 0
		}
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useOrderNotes('ord_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/order-notes', {
			query: { order_id: 'ord_1', limit: 50 }
		})
	})

	it('is in loading state initially', () => {
		mockFetch.mockResolvedValue({ order_notes: [], count: 0 })
		const { result } = renderHookWithClient(() => useOrderNotes('ord_1'))
		expect(result.current.isLoading).toBe(true)
	})

	it('does not fetch when orderId is empty', () => {
		const { result } = renderHookWithClient(() => useOrderNotes(''))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

// ─── useCreateOrderNote ───────────────────────────────────────────────────────

describe('useCreateOrderNote', () => {
	it('posts to /admin/order-notes', async () => {
		const response = { order_note: { id: 'note_new', order_id: 'ord_1', note: 'A note', sent: false } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useCreateOrderNote('ord_1'))

		await act(async () => {
			await result.current.mutateAsync({ order_id: 'ord_1', note: 'A note', sent: false })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/order-notes', {
			method: 'POST',
			body: { order_id: 'ord_1', note: 'A note', sent: false }
		})
	})

	it('posts with sent: true for customer-facing notes', async () => {
		mockFetch.mockResolvedValue({ order_note: { id: 'note_2', sent: true } })

		const { result } = renderHookWithClient(() => useCreateOrderNote('ord_1'))

		await act(async () => {
			await result.current.mutateAsync({ order_id: 'ord_1', note: 'Customer message', sent: true })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/order-notes', {
			method: 'POST',
			body: { order_id: 'ord_1', note: 'Customer message', sent: true }
		})
	})
})

// ─── useDeleteOrderNote ───────────────────────────────────────────────────────

describe('useDeleteOrderNote', () => {
	it('sends DELETE to /admin/order-notes/:id', async () => {
		mockFetch.mockResolvedValue({ deleted: 'note_1' })

		const { result } = renderHookWithClient(() => useDeleteOrderNote('ord_1'))

		await act(async () => {
			await result.current.mutateAsync('note_1')
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/order-notes/note_1', { method: 'DELETE' })
	})
})
