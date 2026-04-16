// Source: packages/reviews/src/api/store/ + packages/reviews/src/api/validators.ts
// Routes: GET/POST /store/reviews/:productId

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type {
	StoreCreateReviewInput,
	StoreReviewListResponse,
	StoreReviewResponse,
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
	}
}
