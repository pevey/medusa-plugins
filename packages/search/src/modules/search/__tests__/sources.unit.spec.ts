import { buildRegistry } from '../lib/sources'
import type { SearchSource } from '../lib/types'

const custom: SearchSource = {
	type: 'content',
	entity: 'content_item',
	fields: ['id'],
	visibility: () => true,
	buildDocument: () => ({}) as any
}

describe('buildRegistry', () => {
	it('registers product by default and nothing else', () => {
		const reg = buildRegistry()
		expect([...reg.keys()]).toEqual(['product'])
	})

	it('activates built-in category/collection only when named', () => {
		const reg = buildRegistry({ sources: ['category'] })
		expect(reg.has('product')).toBe(true)
		expect(reg.has('category')).toBe(true)
		expect(reg.has('collection')).toBe(false)
	})

	it('registers custom source objects by type', () => {
		const reg = buildRegistry({ sources: ['collection', custom] })
		expect(reg.has('collection')).toBe(true)
		expect(reg.get('content')).toBe(custom)
	})

	it('ignores unknown built-in names', () => {
		const reg = buildRegistry({ sources: ['bogus' as any] })
		expect([...reg.keys()]).toEqual(['product'])
	})
})
