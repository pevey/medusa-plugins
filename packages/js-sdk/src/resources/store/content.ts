// Source: packages/content/src/api/store/ + packages/content/src/api/validators.ts
// Routes: GET /content, GET /content/:slug, GET /content/:slug/items, GET /content/:slug/items/:itemSlug

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type {
	StoreContentListQuery,
	StoreContentCollectionListResponse,
	StoreContentCollectionResponse,
	StoreContentItemListQuery,
	StoreContentItemListResponse,
	StoreContentItemResponse,
} from '../../types/content'

export function createStoreContentResource(client: Client) {
	return {
		list: async (
			query?: StoreContentListQuery,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreContentCollectionListResponse>(
				`/content`,
				{ query, headers },
			)
		},

		retrieve: async (
			slug: string,
			query?: StoreContentListQuery,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreContentCollectionResponse>(
				`/content/${slug}`,
				{ query, headers },
			)
		},

		listItems: async (
			slug: string,
			query?: StoreContentItemListQuery,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreContentItemListResponse>(
				`/content/${slug}/items`,
				{ query, headers },
			)
		},

		retrieveItem: async (
			slug: string,
			itemSlug: string,
			query?: StoreContentListQuery,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreContentItemResponse>(
				`/content/${slug}/items/${itemSlug}`,
				{ query, headers },
			)
		},
	}
}
