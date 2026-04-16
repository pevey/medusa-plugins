import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, act } from '@testing-library/react'
import { renderHookWithClient } from './utils'

vi.mock('../../lib/sdk', () => ({
	sdk: { client: { fetch: vi.fn() } }
}))

import { sdk } from '../../lib/sdk'
import {
	useContentCollections,
	useContentCollection,
	useCreateContentCollection,
	useUpdateContentCollection,
	useDeleteContentCollections,
	useContentItems,
	useContentItem,
	useCreateContentItem,
	useUpdateContentItem,
	useDeleteContentItems
} from '../content'

const mockFetch = sdk.client.fetch as ReturnType<typeof vi.fn>

beforeEach(() => { mockFetch.mockReset() })

// ── Content Collections ───────────────────────────────────────────────────────

describe('useContentCollections', () => {
	it('fetches content collections with params', async () => {
		const response = { content_collections: [{ id: 'ct_1', label: 'Blog' }], count: 1, limit: 15, offset: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useContentCollections({ limit: 15 }))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/content', { query: { limit: 15 } })
	})

	it('fetches with no params by default', async () => {
		mockFetch.mockResolvedValue({ content_collections: [], count: 0 })

		const { result } = renderHookWithClient(() => useContentCollections())

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(mockFetch).toHaveBeenCalledWith('/admin/content', { query: {} })
	})

	it('is in loading state initially', () => {
		mockFetch.mockResolvedValue({ content_collections: [], count: 0 })
		const { result } = renderHookWithClient(() => useContentCollections())
		expect(result.current.isLoading).toBe(true)
	})
})

describe('useContentCollection', () => {
	it('fetches a single content collection by id', async () => {
		const response = { content_collection: { id: 'ct_1', label: 'Blog', slug: 'blog' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useContentCollection('ct_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1')
	})

	it('does not fetch when id is undefined', () => {
		const { result } = renderHookWithClient(() => useContentCollection(undefined))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useCreateContentCollection', () => {
	it('posts to /admin/content and invalidates list', async () => {
		const response = { content_collection: { id: 'ct_2', label: 'News' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useCreateContentCollection())

		await act(async () => {
			await result.current.mutateAsync({ label: 'News', slug: 'news', format: 'html' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/content', {
			method: 'POST',
			body: { label: 'News', slug: 'news', format: 'html' }
		})
	})
})

describe('useUpdateContentCollection', () => {
	it('posts to /admin/content/:id and invalidates collection and list', async () => {
		const response = { content_collection: { id: 'ct_1', label: 'Updated Blog' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useUpdateContentCollection('ct_1'))

		await act(async () => {
			await result.current.mutateAsync({ label: 'Updated Blog' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1', {
			method: 'POST',
			body: { label: 'Updated Blog' }
		})
	})
})

describe('useDeleteContentCollections', () => {
	it('sends DELETE with ids array', async () => {
		mockFetch.mockResolvedValue({ deleted: ['ct_1', 'ct_2'] })

		const { result } = renderHookWithClient(() => useDeleteContentCollections())

		await act(async () => {
			await result.current.mutateAsync(['ct_1', 'ct_2'])
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/content', {
			method: 'DELETE',
			body: { ids: ['ct_1', 'ct_2'] }
		})
	})
})

// ── Content Items ──────────────────────────────────────────────────────────────

describe('useContentItems', () => {
	it('fetches content items when collectionId is provided', async () => {
		const response = { content_items: [{ id: 'ci_1', title: 'Hello' }], count: 1 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() =>
			useContentItems('ct_1', { limit: 15 })
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1/items', {
			query: { limit: 15 }
		})
	})

	it('does not fetch when collectionId is undefined', () => {
		mockFetch.mockResolvedValue({ content_items: [], count: 0 })
		const { result } = renderHookWithClient(() => useContentItems(undefined, {}))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useContentItem', () => {
	it('fetches a single content item by id', async () => {
		const response = { content_item: { id: 'ci_1', title: 'Hello', status: 'draft' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useContentItem('ct_1', 'ci_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1/items/ci_1')
	})

	it('does not fetch when id is undefined', () => {
		const { result } = renderHookWithClient(() => useContentItem('ct_1', undefined))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useCreateContentItem', () => {
	it('posts to /admin/content/:collectionId/items', async () => {
		const response = { content_item: { id: 'ci_2', title: 'New Post' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useCreateContentItem('ct_1'))

		await act(async () => {
			await result.current.mutateAsync({
				title: 'New Post',
				slug: 'new-post'
			})
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1/items', {
			method: 'POST',
			body: { title: 'New Post', slug: 'new-post' }
		})
	})
})

describe('useUpdateContentItem', () => {
	it('posts to /admin/content/:collectionId/items/:id', async () => {
		const response = { content_item: { id: 'ci_1', title: 'Updated' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useUpdateContentItem('ct_1', 'ci_1'))

		await act(async () => {
			await result.current.mutateAsync({ title: 'Updated' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1/items/ci_1', {
			method: 'POST',
			body: { title: 'Updated' }
		})
	})
})

describe('useDeleteContentItems', () => {
	it('sends DELETE with ids array', async () => {
		mockFetch.mockResolvedValue({ deleted: ['ci_1'] })

		const { result } = renderHookWithClient(() => useDeleteContentItems('ct_1'))

		await act(async () => {
			await result.current.mutateAsync(['ci_1'])
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/content/ct_1/items', {
			method: 'DELETE',
			body: { ids: ['ci_1'] }
		})
	})
})
