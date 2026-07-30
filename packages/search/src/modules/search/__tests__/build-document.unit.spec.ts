import { buildProductDocument, buildCategoryDocument, buildCollectionDocument } from '../lib/build-document'

describe('buildProductDocument', () => {
	it('folds distinct available option values into primary_text and captures channels', () => {
		const doc = buildProductDocument({
			id: 'prod_1',
			title: 'Ethiopia Yirgacheffe',
			description: 'Floral, citrus',
			handle: 'ethiopia-yirgacheffe',
			variants: [{ options: [{ value: 'Decaf' }, { value: 'Whole Bean' }] }, { options: [{ value: 'Regular' }, { value: 'Whole Bean' }] }],
			sales_channels: [{ id: 'sc_retail' }]
		})
		expect(doc.type).toBe('product')
		expect(doc.entity_id).toBe('prod_1')
		expect(doc.slug).toBe('ethiopia-yirgacheffe')
		expect(doc.weight).toBe(1)
		expect(doc.body_text).toBe('Floral, citrus')
		expect(doc.sales_channel_ids).toEqual(['sc_retail'])
		expect(doc.primary_text).toBe('Ethiopia Yirgacheffe Decaf Whole Bean Regular')
	})

	it('handles a product with no variants or channels', () => {
		const doc = buildProductDocument({ id: 'prod_2', title: 'Sample', handle: 'sample' })
		expect(doc.primary_text).toBe('Sample')
		expect(doc.body_text).toBeNull()
		expect(doc.sales_channel_ids).toEqual([])
	})

	it('puts the full untruncated description in body_text and a truncated snippet', () => {
		const longDesc = 'x'.repeat(500)
		const doc = buildProductDocument({
			id: 'p1',
			title: 'Coffee',
			handle: 'coffee',
			description: longDesc
		})
		expect(doc.body_text).toBe(longDesc)
		expect(doc.snippet!.length).toBeLessThanOrEqual(160)
		expect('secondary_text' in doc).toBe(false)
	})
})

describe('buildCategoryDocument / buildCollectionDocument', () => {
	it('category is global (null channels), weight 0.9', () => {
		const doc = buildCategoryDocument({
			id: 'pcat_1',
			name: 'Single Origin',
			handle: 'single-origin'
		})
		expect(doc).toMatchObject({
			type: 'category',
			entity_id: 'pcat_1',
			slug: 'single-origin',
			title: 'Single Origin',
			primary_text: 'Single Origin',
			weight: 0.9,
			sales_channel_ids: null,
			group_slug: null
		})
	})

	it('collection weight 0.9', () => {
		const doc = buildCollectionDocument({ id: 'pcol_1', title: 'Holiday', handle: 'holiday' })
		expect(doc).toMatchObject({
			type: 'collection',
			slug: 'holiday',
			weight: 0.9,
			sales_channel_ids: null
		})
	})
})
