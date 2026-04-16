import { Client, Store as MedusaStore } from '@medusajs/js-sdk'
import type { ClientHeaders } from '@medusajs/js-sdk'
import type { HttpTypes, SelectParams } from '@medusajs/types'
import { createStoreReviewResource } from './resources/store/review'
import { createStoreContentResource } from './resources/store/content'
import { createStoreFormResource } from './resources/store/form'
import type { StoreProductListResponse, StoreProductResponse } from './types/expanded'

type CoreStore = InstanceType<typeof MedusaStore>

export class Store {
	private core: CoreStore
	private client: Client

	// Custom plugin resources
	public review: ReturnType<typeof createStoreReviewResource>
	public content: ReturnType<typeof createStoreContentResource>
	public form: ReturnType<typeof createStoreFormResource>

	constructor(client: Client) {
		this.client = client
		this.core = new MedusaStore(client)
		this.review = createStoreReviewResource(client)
		this.content = createStoreContentResource(client)
		this.form = createStoreFormResource(client)
	}

	// ── Overridden resources (expanded types) ────────────────────────────────

	public product = {
		list: async (
			query?: HttpTypes.StoreProductListParams,
			headers?: ClientHeaders,
		) => {
			return this.client.fetch<StoreProductListResponse>(
				`/store/products`,
				{ query, headers },
			)
		},
		retrieve: async (
			id: string,
			query?: SelectParams,
			headers?: ClientHeaders,
		) => {
			return this.client.fetch<StoreProductResponse>(
				`/store/products/${id}`,
				{ query, headers },
			)
		},
	}

	// ── Delegated core resources ─────────────────────────────────────────────

	get region(): CoreStore['region'] { return this.core.region }
	get collection(): CoreStore['collection'] { return this.core.collection }
	get category(): CoreStore['category'] { return this.core.category }
	get cart(): CoreStore['cart'] { return this.core.cart }
	get order(): CoreStore['order'] { return this.core.order }
	get customer(): CoreStore['customer'] { return this.core.customer }
	get fulfillment(): CoreStore['fulfillment'] { return this.core.fulfillment }
	get payment(): CoreStore['payment'] { return this.core.payment }
	get locale(): CoreStore['locale'] { return this.core.locale }
}
