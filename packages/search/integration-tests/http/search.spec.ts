import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import {
	createProductsWorkflow,
	updateProductsWorkflow,
	createProductCategoriesWorkflow,
	createSalesChannelsWorkflow,
	createApiKeysWorkflow,
	linkSalesChannelsToApiKeyWorkflow
} from '@medusajs/medusa/core-flows'
import upsertSearchDocumentWorkflow from '../../src/workflows/upsert-search-document'
import reindexSearchDocumentsWorkflow from '../../src/workflows/reindex-search-documents'
import searchProductHandler from '../../src/subscribers/search-product'
import searchCategoryHandler from '../../src/subscribers/search-category'
import SearchModuleService from '../../src/modules/search/service'
import type { SearchDocumentInput } from '../../src/modules/search/lib/types'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

const decafProduct = (title: string, status: 'draft' | 'published') => ({
	title,
	status,
	options: [{ title: 'Decaf', values: ['Decaf', 'Regular'] }],
	variants: [
		{ title: 'Decaf', options: { Decaf: 'Decaf' }, prices: [] },
		{ title: 'Regular', options: { Decaf: 'Regular' }, prices: [] }
	]
})

const seed = (over: Partial<SearchDocumentInput>): SearchDocumentInput => ({
	type: 'product',
	entity_id: 'x',
	slug: 'x',
	group_slug: null,
	title: 'x',
	snippet: null,
	primary_text: 'x',
	secondary_text: null,
	weight: 1,
	sales_channel_ids: ['sc_retail'],
	...over
})

medusaIntegrationTestRunner({
	dbName: 'medusa-search',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		const seedSnapshot = async () => {
			await utils.waitWorkflowExecutions()
			await dbUtils.snapshot()
		}

		let container: any
		let service: SearchModuleService

		beforeAll(() => {
			container = getContainer()
			service = container.resolve('search')
		})

		describe('module + migration', () => {
			it('creates/lists a search_document and pg_trgm is installed', async () => {
				const [doc] = await service.createSearchDocuments([
					seed({ entity_id: 'prod_test_1', slug: 'ethiopia-yirgacheffe', title: 'Ethiopia Yirgacheffe', primary_text: 'Ethiopia Yirgacheffe', sales_channel_ids: ['sc_1'] })
				])
				expect(doc.id).toMatch(/^srch_/)
				const listed = await service.listSearchDocuments({ entity_id: 'prod_test_1' })
				expect(listed).toHaveLength(1)

				const knex = (service as any).__container__.manager.getKnex()
				const { rows } = await knex.raw(`SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`)
				expect(rows).toHaveLength(1)
			})
		})

		describe('service: registry + search()', () => {
			beforeAll(async () => {
				await service.upsertDocument(seed({ entity_id: 's_yirg', slug: 'ethiopia-yirgacheffe', title: 'Ethiopia Yirgacheffe', primary_text: 'Ethiopia Yirgacheffe Decaf Regular Whole Bean' }))
				await service.upsertDocument(seed({ entity_id: 's_reg', slug: 'sumatra', title: 'Sumatra', primary_text: 'Sumatra Regular Whole Bean' }))
				await service.upsertDocument(seed({ type: 'category', entity_id: 's_cat', slug: 'single-origin', title: 'Single Origin', primary_text: 'Single Origin', weight: 0.9, sales_channel_ids: null }))
				await service.upsertDocument(seed({ entity_id: 's_wholesale', slug: 'bulk', title: 'Bulk Beans', primary_text: 'Bulk Beans', sales_channel_ids: ['sc_wholesale'] }))
				await seedSnapshot()
			})

			it('registry reflects options (product always; category/collection enabled)', () => {
				expect(service.isSourceEnabled('product')).toBe(true)
				expect(service.isSourceEnabled('category')).toBe(true)
				expect(service.isSourceEnabled('collection')).toBe(true)
				expect(service.isSourceEnabled('content')).toBe(false)
			})

			it('short-circuits empty for < 2 chars', async () => {
				expect(await service.search('a', 12, ['sc_retail'])).toEqual([])
			})

			it('is typo tolerant on product names', async () => {
				const hits = await service.search('yirgachefe', 12, ['sc_retail'])
				expect(hits.map((h) => h.slug)).toContain('ethiopia-yirgacheffe')
			})

			it('matches available attribute values, excludes products without them', async () => {
				const slugs = (await service.search('decaf', 12, ['sc_retail'])).map((h) => h.slug)
				expect(slugs).toContain('ethiopia-yirgacheffe')
				expect(slugs).not.toContain('sumatra')
			})

			it('scopes by sales channel; global docs always appear', async () => {
				expect((await service.search('bulk', 12, ['sc_retail'])).map((h) => h.slug)).not.toContain('bulk')
				expect((await service.search('bulk', 12, ['sc_wholesale'])).map((h) => h.slug)).toContain('bulk')
				expect((await service.search('single origin', 12, ['sc_retail'])).map((h) => h.type)).toContain('category')
			})

			it('upsertDocument inserts then updates; deleteDocumentByEntity removes', async () => {
				await service.upsertDocument(seed({ entity_id: 's_up', title: 'First', primary_text: 'First' }))
				await service.upsertDocument(seed({ entity_id: 's_up', title: 'Second', primary_text: 'Second' }))
				const rows = await service.listSearchDocuments({ type: 'product', entity_id: 's_up' })
				expect(rows).toHaveLength(1)
				expect(rows[0].title).toBe('Second')
				await service.deleteDocumentByEntity('product', 's_up')
				expect(await service.listSearchDocuments({ type: 'product', entity_id: 's_up' })).toHaveLength(0)
			})
		})

		describe('workflows', () => {
			it('indexes a published product with its available option values', async () => {
				const { result } = await createProductsWorkflow(container).run({ input: { products: [decafProduct('Ethiopia Yirgacheffe', 'published')] } })
				const productId = result[0].id
				await upsertSearchDocumentWorkflow(container).run({ input: { type: 'product', id: productId } })
				const [doc] = await service.listSearchDocuments({ type: 'product', entity_id: productId })
				expect(doc).toBeDefined()
				expect(doc.primary_text).toContain('Decaf')
				expect(doc.primary_text).toContain('Regular')
			})

			it('removes the document when the product becomes unpublished', async () => {
				const { result } = await createProductsWorkflow(container).run({ input: { products: [decafProduct('Temp', 'published')] } })
				const id = result[0].id
				await upsertSearchDocumentWorkflow(container).run({ input: { type: 'product', id } })
				expect(await service.listSearchDocuments({ type: 'product', entity_id: id })).toHaveLength(1)
				await updateProductsWorkflow(container).run({ input: { selector: { id }, update: { status: 'draft' } } })
				await upsertSearchDocumentWorkflow(container).run({ input: { type: 'product', id } })
				expect(await service.listSearchDocuments({ type: 'product', entity_id: id })).toHaveLength(0)
			})

			it('reindex rebuilds documents for all published products (registry-driven)', async () => {
				await createProductsWorkflow(container).run({ input: { products: [decafProduct('Reindex Coffee A', 'published'), decafProduct('Reindex Coffee B', 'draft')] } })
				const { result } = await reindexSearchDocumentsWorkflow(container).run({})
				expect(result.counts.product).toBeGreaterThanOrEqual(1)
				const docs = await service.listSearchDocuments({ type: 'product' })
				expect(docs.some((d) => d.title === 'Reindex Coffee A')).toBe(true)
				expect(docs.some((d) => d.title === 'Reindex Coffee B')).toBe(false)
			})
		})

		describe('subscribers', () => {
			const fire = (handler: any, name: string, id: string) => handler({ event: { name, data: { id } }, container })

			it('product subscriber indexes on created, removes on deleted, reindexes on variant', async () => {
				const { result } = await createProductsWorkflow(container).run({ input: { products: [decafProduct('Sub Coffee', 'published')] } })
				const productId = result[0].id
				const variantId = result[0].variants[0].id
				await fire(searchProductHandler, 'product.created', productId)
				let docs = await service.listSearchDocuments({ type: 'product', entity_id: productId })
				expect(docs).toHaveLength(1)
				await fire(searchProductHandler, 'product.deleted', productId)
				expect(await service.listSearchDocuments({ type: 'product', entity_id: productId })).toHaveLength(0)
				await fire(searchProductHandler, 'product-variant.updated', variantId)
				expect(await service.listSearchDocuments({ type: 'product', entity_id: productId })).toHaveLength(1)
			})

			it('category subscriber indexes when the category source is enabled', async () => {
				const { result } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{ name: 'Single Origin', is_active: true }] } })
				const id = result[0].id
				await fire(searchCategoryHandler, 'product-category.created', id)
				expect(await service.listSearchDocuments({ type: 'category', entity_id: id })).toHaveLength(1)
				await fire(searchCategoryHandler, 'product-category.deleted', id)
				expect(await service.listSearchDocuments({ type: 'category', entity_id: id })).toHaveLength(0)
			})
		})

		describe('GET /store/search', () => {
			let pak: string
			let scId: string

			beforeAll(async () => {
				const { result: channels } = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: 'Retail Test' }] } })
				scId = channels[0].id
				const { result: keys } = await createApiKeysWorkflow(container).run({ input: { api_keys: [{ title: 'Retail PAK', type: 'publishable', created_by: 'test' }] } })
				pak = keys[0].token
				await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: keys[0].id, add: [scId] } })
				await service.upsertDocument(seed({ entity_id: 'rt_yirg', slug: 'ethiopia-yirgacheffe', title: 'Ethiopia Yirgacheffe', primary_text: 'Ethiopia Yirgacheffe Decaf', snippet: 'Floral', secondary_text: 'Floral', sales_channel_ids: [scId] }))
				await seedSnapshot()
			})

			const pk = () => ({ headers: { 'x-publishable-api-key': pak } })

			it('returns typo-tolerant hits scoped to the key channel', async () => {
				const res = await api.get('/store/search?q=yirgachefe', pk())
				expect(res.status).toBe(200)
				expect(res.data.hits.map((h: any) => h.slug)).toContain('ethiopia-yirgacheffe')
			})

			it('returns empty hits for a < 2 char query without error', async () => {
				const res = await api.get('/store/search?q=a', pk())
				expect(res.status).toBe(200)
				expect(res.data.hits).toEqual([])
			})
		})
	}
})
