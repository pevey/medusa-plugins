// Source: packages/ratings/src/api/store/ + packages/ratings/src/api/validators.ts
// Routes: GET/POST /store/reviews/:productId
//         POST/DELETE /store/reviews/:productId/:reviewId

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type {
	StoreCreateReviewInput,
	StoreReviewDeleteResponse,
	StoreReviewListResponse,
	StoreReviewResponse,
	StoreReviewSummaryResponse,
	StoreUpdateReviewInput,
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

		// Edit the caller's own review. Requires a signed-in customer; the backend
		// rejects a non-owner with 403 and resets the review to its default status
		// (typically pending) for re-moderation.
		update: async (
			productId: string,
			reviewId: string,
			body: StoreUpdateReviewInput,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreReviewResponse>(
				`/store/reviews/${productId}/${reviewId}`,
				{ method: 'POST', body, headers },
			)
		},

		// Delete the caller's own review. Requires a signed-in customer; the backend
		// rejects a non-owner with 403.
		delete: async (
			productId: string,
			reviewId: string,
			headers?: ClientHeaders,
		) => {
			return client.fetch<StoreReviewDeleteResponse>(
				`/store/reviews/${productId}/${reviewId}`,
				{ method: 'DELETE', headers },
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
