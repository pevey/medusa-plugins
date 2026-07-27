// Source: packages/ratings/src/api/store/ + packages/ratings/src/api/validators.ts
// Routes: GET/POST /store/reviews/:productId

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type {
	StoreCreateReviewInput,
	StoreReviewListResponse,
	StoreReviewResponse,
	StoreReviewSummaryResponse,
} from '../../types/review'

export function createStoreReviewResource(client: Client) {
	return {
		list: async (
			productId: string,
			query?: Record<string, unknown>,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreReviewListResponse>(
				`/store/reviews/${productId}`,
				{ query, headers },
			)
		},

		create: async (
			productId: string,
			body: StoreCreateReviewInput,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreReviewResponse>(
				`/store/reviews/${productId}`,
				{ method: 'POST', body, headers },
			)
		},

		summary: async (productId: string, headers?: ClientHeaders) => {
			return client.fetch<StoreReviewSummaryResponse>(
				`/store/reviews/${productId}/summary`,
				{ headers },
			)
		},
	}
}
