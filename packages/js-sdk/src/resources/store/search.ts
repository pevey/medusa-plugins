// Source: packages/search/src/api/store/search/route.ts + middlewares/search.ts
// Routes: GET /store/search

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type { StoreSearchQuery, StoreSearchResponse } from '../../types/search'

export function createStoreSearchResource(client: Client) {
	return {
		query: async (query: StoreSearchQuery, headers?: ClientHeaders) => {
			return client.fetch<StoreSearchResponse>(`/store/search`, { query, headers })
		}
	}
}
