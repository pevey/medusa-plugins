// Expanded core types that include custom plugin data
import type { HttpTypes } from '@medusajs/types'
import type { Review } from './review'

// ── Store Product with Reviews ───────────────────────────────────────────────

export interface StoreProduct extends HttpTypes.StoreProduct {
	reviews?: Review[]
	review_stats?: {
		average_rating: number
		count: number
	}
}

export interface StoreProductListResponse {
	products: StoreProduct[]
	count: number
	offset: number
	limit: number
}

export interface StoreProductResponse {
	product: StoreProduct
}

// ── Admin Product with Reviews ───────────────────────────────────────────────

export interface AdminProduct extends HttpTypes.AdminProduct {
	reviews?: Review[]
}

export interface AdminProductListResponse {
	products: AdminProduct[]
	count: number
	offset: number
	limit: number
}

export interface AdminProductResponse {
	product: AdminProduct
}
