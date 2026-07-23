import type { Product, WithContext, Offer, AggregateOffer, Review } from 'schema-dts'
import type { StoreProduct, StoreProductVariant } from '@medusajs/types'
import { inStock, isPurchasable } from './product-logic.js'

export interface ProductSchemaOpts { url?: string }

type ReviewLike = { rating?: number; title?: string | null; body?: string; author_name?: string; created_at?: string; status?: string }

function variantPrice(v: StoreProductVariant): { amount: number; currency: string } | null {
	const cp = v.calculated_price as { calculated_amount?: number | null; currency_code?: string | null } | undefined
	if (cp?.calculated_amount == null || !cp.currency_code) return null
	return { amount: cp.calculated_amount, currency: cp.currency_code }
}

export function productSchema(product: StoreProduct | null, opts: ProductSchemaOpts = {}): WithContext<Product> | null {
	if (!product) return null
	const variants = product.variants ?? []
	const prices = variants.map(variantPrice).filter((p): p is { amount: number; currency: string } => p !== null)
	const availability = variants.some((v) => inStock(v))
		? 'https://schema.org/InStock'
		: variants.some((v) => isPurchasable(v))
		? 'https://schema.org/BackOrder'
		: 'https://schema.org/OutOfStock'

	const imgs = (product.images?.map((i) => i.url).filter(Boolean) as string[] | undefined) ?? []
	const image = imgs.length ? imgs : product.thumbnail ? [product.thumbnail] : undefined

	const schema: WithContext<Product> = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.title
	}
	if (product.description) schema.description = product.description
	if (image) schema.image = image
	if (variants.length === 1 && variants[0].sku) schema.sku = variants[0].sku

	if (prices.length) {
		const priceCurrency = prices[0].currency.toUpperCase()
		if (prices.length === 1) {
			const offer: Offer = { '@type': 'Offer', price: prices[0].amount, priceCurrency, availability }
			if (opts.url) offer.url = opts.url
			schema.offers = offer
		} else {
			const amounts = prices.map((p) => p.amount)
			const agg: AggregateOffer = {
				'@type': 'AggregateOffer',
				lowPrice: Math.min(...amounts),
				highPrice: Math.max(...amounts),
				priceCurrency,
				offerCount: prices.length,
				availability
			}
			schema.offers = agg
		}
	}

	// Reviews: `review` is a custom relation (not on StoreProduct) — defensive cast; approved only.
	const rawReviews = (product as { review?: unknown }).review
	const reviews = (Array.isArray(rawReviews) ? (rawReviews as ReviewLike[]) : []).filter(
		(r) => r.status === 'approved' && typeof r.rating === 'number'
	)
	if (reviews.length) {
		const avg = reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
		schema.aggregateRating = {
			'@type': 'AggregateRating',
			ratingValue: Math.round(avg * 10) / 10,
			reviewCount: reviews.length,
			bestRating: 5
		}
		schema.review = reviews.map((r): Review => {
			const rev: Review = { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating!, bestRating: 5 } }
			if (r.author_name) rev.author = { '@type': 'Person', name: r.author_name }
			if (r.title) rev.name = r.title
			if (r.body) rev.reviewBody = r.body
			if (r.created_at) rev.datePublished = r.created_at
			return rev
		})
	}
	return schema
}
