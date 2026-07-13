import {
	buildProductDocument,
	buildCategoryDocument,
	buildCollectionDocument
} from '../lib/build-document'

describe('buildProductDocument', () => {
	it('folds distinct available option values into primary_text and captures channels', () => {
		const doc = buildProductDocument({
			id: 'prod_1',
			title: 'Ethiopia Yirgacheffe',
			description: 'Floral, citrus',
			handle: 'ethiopia-yirgacheffe',
			variants: [
				{ options: [{ value: 'Decaf' }, { value: 'Whole Bean' }] },
				{ options: [{ value: 'Regular' }, { value: 'Whole Bean' }] }
			],
			sales_channels: [{ id: 'sc_retail' }]
		})
		expect(doc.type).toBe('product')
		expect(doc.entity_id).toBe('prod_1')
		expect(doc.slug).toBe('ethiopia-yirgacheffe')
		expect(doc.weight).toBe(1)
		expect(doc.secondary_text).toBe('Floral, citrus')
		expect(doc.sales_channel_ids).toEqual(['sc_retail'])
		expect(doc.primary_text).toBe('Ethiopia Yirgacheffe Decaf Whole Bean Regular')
	})

	it('handles a product with no variants or channels', () => {
		const doc = buildProductDocument({ id: 'prod_2', title: 'Sample', handle: 'sample' })
		expect(doc.primary_text).toBe('Sample')
		expect(doc.secondary_text).toBeNull()
		expect(doc.sales_channel_ids).toEqual([])
	})
})

describe('buildCategoryDocument / buildCollectionDocument', () => {
	it('category is global (null channels), weight 0.9', () => {
		const doc = buildCategoryDocument({ id: 'pcat_1', name: 'Single Origin', handle: 'single-origin' })
		expect(doc).toMatchObject({
			type: 'category',
			entity_id: 'pcat_1',
			slug: 'single-origin',
			title: 'Single Origin',
			primary_text: 'Single Origin',
			secondary_text: null,
			weight: 0.9,
			sales_channel_ids: null,
			group_slug: null
		})
	})

	it('collection weight 0.9', () => {
		const doc = buildCollectionDocument({ id: 'pcol_1', title: 'Holiday', handle: 'holiday' })
		expect(doc).toMatchObject({ type: 'collection', slug: 'holiday', weight: 0.9, sales_channel_ids: null })
	})
})
