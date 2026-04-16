// Source: packages/reviews/src/api/admin/ + packages/reviews/src/api/validators.ts
// Routes: GET/POST/DELETE /admin/reviews, POST /admin/reviews/approve, POST /admin/reviews/reject

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type {
	AdminReviewListQuery,
	AdminReviewListResponse,
	AdminReviewResponse,
	AdminReviewDeleteResponse,
	AdminReviewBatchResponse,
	AdminUpdateReviewInput,
} from '../../types/review'

export function createAdminReviewResource(client: Client) {
	return {
		list: async (
			query?: AdminReviewListQuery,
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewListResponse>(
				`/admin/reviews`,
				{ query, headers },
			)
		},

		retrieve: async (
			id: string,
			query?: Record<string, unknown>,
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewResponse>(
				`/admin/reviews/${id}`,
				{ query, headers },
			)
		},

		update: async (
			id: string,
			body: AdminUpdateReviewInput,
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewResponse>(
				`/admin/reviews/${id}`,
				{ method: 'POST', body, headers },
			)
		},

		delete: async (
			id: string,
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewDeleteResponse>(
				`/admin/reviews/${id}`,
				{ method: 'DELETE', headers },
			)
		},

		batchDelete: async (
			ids: string[],
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewBatchResponse>(
				`/admin/reviews`,
				{ method: 'DELETE', body: { ids }, headers },
			)
		},

		approve: async (
			ids: string[],
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewBatchResponse>(
				`/admin/reviews/approve`,
				{ method: 'POST', body: { ids }, headers },
			)
		},

		reject: async (
			ids: string[],
			headers?: ClientHeaders,
		) => {
			return client.fetch<AdminReviewBatchResponse>(
				`/admin/reviews/reject`,
				{ method: 'POST', body: { ids }, headers },
			)
		},
	}
}
