/// <reference types="jest" />
import { declareRestrictedFields, restrictedFieldsForPath } from '../field-restrictions'

const resetRegistry = () => {
	;(global as any).AccessRestrictedFields = new Map()
}

describe('declareRestrictedFields', () => {
	beforeEach(resetRegistry)

	it('applies a declaration to its prefix and everything under it', () => {
		declareRestrictedFields({ prefix: '/content', fields: ['created_by'] })

		expect(restrictedFieldsForPath('/content')).toEqual(new Set(['created_by']))
		expect(restrictedFieldsForPath('/content/articles/art_1')).toEqual(new Set(['created_by']))
	})

	it('matches prefixes on segment boundaries only', () => {
		declareRestrictedFields({ prefix: '/content', fields: ['created_by'] })

		expect(restrictedFieldsForPath('/contents')).toEqual(new Set())
		expect(restrictedFieldsForPath('/contents/articles')).toEqual(new Set())
	})

	it('union-merges declarations for the same prefix', () => {
		declareRestrictedFields({ prefix: '/store', fields: ['customer_tags'] })
		declareRestrictedFields({ prefix: '/store', fields: ['order_notes', 'customer_tags'] })

		expect(restrictedFieldsForPath('/store/customers/me')).toEqual(new Set(['customer_tags', 'order_notes']))
	})

	it('unions every declaration whose prefix matches the path', () => {
		declareRestrictedFields({ prefix: '/', fields: ['internal_ref'] })
		declareRestrictedFields({ prefix: '/store', fields: ['customer_tags'] })
		declareRestrictedFields({ prefix: '/store/customers', fields: ['segments'] })

		expect(restrictedFieldsForPath('/store/customers/me')).toEqual(new Set(['internal_ref', 'customer_tags', 'segments']))
		expect(restrictedFieldsForPath('/store/products')).toEqual(new Set(['internal_ref', 'customer_tags']))
		expect(restrictedFieldsForPath('/admin/products')).toEqual(new Set(['internal_ref']))
	})

	it('matches request paths case-insensitively, as Express routes them', () => {
		declareRestrictedFields({ prefix: '/store', fields: ['customer_tags'] })

		expect(restrictedFieldsForPath('/Store/customers/me')).toEqual(new Set(['customer_tags']))
	})

	it('normalizes trailing and duplicate slashes on declared prefixes and request paths', () => {
		declareRestrictedFields({ prefix: '/content/', fields: ['created_by'] })
		declareRestrictedFields({ prefix: '//content', fields: ['updated_at'] })

		expect(restrictedFieldsForPath('/content//articles/')).toEqual(new Set(['created_by', 'updated_at']))
	})

	it('treats an empty fields array as a no-op declaration', () => {
		declareRestrictedFields({ prefix: '/content', fields: [] })

		expect(restrictedFieldsForPath('/content')).toEqual(new Set())
	})

	it('throws a typed INVALID_DATA error when the prefix does not start with a slash', () => {
		let caught: any
		try {
			declareRestrictedFields({ prefix: 'content', fields: ['created_by'] })
		} catch (error) {
			caught = error
		}

		expect(caught).toBeDefined()
		expect(caught.type).toBe('invalid_data')
		expect(caught.message).toMatch(/must start with/i)
	})

	it.each(['customer.customer_tags', '', ' ', '-created_by', '+created_by', '*created_by', 'created by'])(
		'rejects "%s" as a field entry — segments only',
		entry => {
			let caught: any
			try {
				declareRestrictedFields({ prefix: '/content', fields: [entry] })
			} catch (error) {
				caught = error
			}

			expect(caught).toBeDefined()
			expect(caught.type).toBe('invalid_data')
			expect(caught.message).toMatch(/field segment/i)
		}
	)

	it('registers nothing from a declaration whose entries are rejected', () => {
		try {
			declareRestrictedFields({ prefix: '/content', fields: ['created_by', 'customer.password'] })
		} catch {
			/* asserted above; this test is about the registry state */
		}

		expect(restrictedFieldsForPath('/content')).toEqual(new Set())
	})
})
