/// <reference types="jest" />
import { declareRestrictedFields } from '../field-restrictions'
import { parseRequestedFieldPaths, restrictedFieldsGuard, stripRestrictedSegments } from '../restricted-fields-guard'

const resetRegistry = () => {
	;(global as any).AccessRestrictedFields = new Map()
}

describe('parseRequestedFieldPaths', () => {
	it('splits a comma-separated string and trims entries', () => {
		expect(parseRequestedFieldPaths('id, title ,variants.title')).toEqual(['id', 'title', 'variants.title'])
	})

	it('flattens array input as produced by fields[]= query syntax', () => {
		expect(parseRequestedFieldPaths(['id,title', 'orders.id'])).toEqual(['id', 'title', 'orders.id'])
	})

	it('drops removal entries and strips selection-syntax prefixes', () => {
		expect(parseRequestedFieldPaths('+customer_tags,-orders,*variants')).toEqual(['customer_tags', 'variants'])
	})

	it('returns an empty list for absent or non-string input', () => {
		expect(parseRequestedFieldPaths(undefined)).toEqual([])
		expect(parseRequestedFieldPaths({ nested: 'object' })).toEqual([])
		expect(parseRequestedFieldPaths('')).toEqual([])
	})
})

describe('stripRestrictedSegments', () => {
	it('preserves envelope keys while stripping the same segment at depth', () => {
		const body = {
			order: { id: 'ord_1', customer: { id: 'cus_1', orders: [{ id: 'ord_2' }] } },
			count: 1
		}

		const stripped = stripRestrictedSegments(body, new Set(['orders']))

		expect(stripped).toBe(true)
		expect(body.order.id).toBe('ord_1')
		expect(body.order.customer).toEqual({ id: 'cus_1' })
	})

	it('strips inside entity items of a list envelope', () => {
		const body = { customers: [{ id: 'cus_1', customer_tags: [{ tag: 'vip' }] }, { id: 'cus_2' }], count: 2 }

		expect(stripRestrictedSegments(body, new Set(['customer_tags']))).toBe(true)
		expect(body.customers).toEqual([{ id: 'cus_1' }, { id: 'cus_2' }])
	})

	it('treats a bare-array body as a list of entities', () => {
		const body = [{ id: 'art_1', created_by: 'usr_1' }]

		expect(stripRestrictedSegments(body, new Set(['created_by']))).toBe(true)
		expect(body).toEqual([{ id: 'art_1' }])
	})

	it('reports when nothing was stripped', () => {
		const body = { products: [{ id: 'prod_1' }] }

		expect(stripRestrictedSegments(body, new Set(['orders']))).toBe(false)
		expect(body).toEqual({ products: [{ id: 'prod_1' }] })
	})

	it('survives cyclic structures', () => {
		const entity: any = { id: 'x', orders: [] }
		entity.self = entity
		const body = { thing: entity }

		expect(stripRestrictedSegments(body, new Set(['orders']))).toBe(true)
		expect(entity.orders).toBeUndefined()
	})

	it('ignores non-object bodies', () => {
		expect(stripRestrictedSegments('plain string', new Set(['orders']))).toBe(false)
		expect(stripRestrictedSegments(null, new Set(['orders']))).toBe(false)
	})
})

describe('restrictedFieldsGuard', () => {
	beforeEach(resetRegistry)

	const debug = jest.fn()
	const error = jest.fn()

	const makeReq = (overrides: Record<string, unknown> = {}) => {
		const restricted: string[] = []
		return {
			method: 'GET',
			originalUrl: '/store/products?fields=id',
			query: {} as Record<string, unknown>,
			scope: { resolve: () => ({ debug, error }) },
			restrictedFields: {
				list: () => [...restricted],
				add: (fields: string[]) => restricted.push(...fields)
			},
			...overrides
		} as any
	}

	const makeRes = () => {
		const sent: { body?: unknown; status?: number } = {}
		const res: any = {
			headersSent: false,
			status: (code: number) => {
				sent.status = code
				return res
			},
			json: (body: unknown) => {
				sent.body = body
				return res
			}
		}
		return { res, sent }
	}

	beforeEach(() => {
		debug.mockClear()
		error.mockClear()
	})

	it('passes through untouched when nothing applies to the path', async () => {
		const req = makeReq({ restrictedFields: undefined, originalUrl: '/store/products' })
		const { res } = makeRes()
		const originalJson = res.json
		const next = jest.fn()

		await restrictedFieldsGuard(req, res, next)

		expect(next).toHaveBeenCalled()
		expect(res.json).toBe(originalJson)
	})

	it('strips core-config restricted segments from the response', async () => {
		const req = makeReq()
		req.restrictedFields.add(['orders'])
		const { res, sent } = makeRes()

		await restrictedFieldsGuard(req, res, jest.fn())
		res.json({ products: [{ id: 'prod_1', orders: [{ id: 'ord_1' }] }], count: 1 })

		expect(sent.body).toEqual({ products: [{ id: 'prod_1' }], count: 1 })
	})

	it('feeds registry declarations into req.restrictedFields and strips them', async () => {
		declareRestrictedFields({ prefix: '/store', fields: ['customer_tags'] })
		const req = makeReq({ originalUrl: '/store/customers/me' })
		const { res, sent } = makeRes()

		await restrictedFieldsGuard(req, res, jest.fn())

		expect(req.restrictedFields.list()).toContain('customer_tags')

		res.json({ customer: { id: 'cus_1', customer_tags: [{ tag: 'vip' }] } })
		expect(sent.body).toEqual({ customer: { id: 'cus_1' } })
	})

	it('enforces registry declarations on prefixes with no core restrictedFields carrier', async () => {
		declareRestrictedFields({ prefix: '/content', fields: ['created_by'] })
		const req = makeReq({ originalUrl: '/content/articles', restrictedFields: undefined })
		const { res, sent } = makeRes()

		await restrictedFieldsGuard(req, res, jest.fn())
		res.json({ articles: [{ id: 'art_1', created_by: 'usr_1' }] })

		expect(sent.body).toEqual({ articles: [{ id: 'art_1' }] })
	})

	it('rewrites ?order= naming a restricted segment to an unorderable field', async () => {
		const req = makeReq({ query: { order: '-orders' } })
		req.restrictedFields.add(['orders'])

		await restrictedFieldsGuard(req, makeRes().res, jest.fn())

		expect(req.query.order).toBe('__restricted_field__')
		expect(debug).toHaveBeenCalledWith(expect.stringContaining('restricted_field_probe (order: -orders)'))
	})

	it('leaves an unrestricted ?order= untouched', async () => {
		const req = makeReq({ query: { order: 'title' } })
		req.restrictedFields.add(['orders'])

		await restrictedFieldsGuard(req, makeRes().res, jest.fn())

		expect(req.query.order).toBe('title')
	})

	it('logs a probe when the raw ?fields= explicitly names a restricted segment', async () => {
		const req = makeReq({ query: { fields: 'id,orders.id' } })
		req.restrictedFields.add(['orders'])
		const { res } = makeRes()

		await restrictedFieldsGuard(req, res, jest.fn())
		res.json({ products: [] })

		expect(debug).toHaveBeenCalledWith(expect.stringContaining('restricted_field_probe (fields: orders.id)'))
	})

	it('logs implicit strips at debug without the probe token', async () => {
		const req = makeReq({ query: {} })
		req.restrictedFields.add(['orders'])
		const { res } = makeRes()

		await restrictedFieldsGuard(req, res, jest.fn())
		res.json({ products: [{ id: 'prod_1', orders: [] }] })

		expect(debug).toHaveBeenCalledWith(expect.stringContaining('restricted fields stripped'))
		expect(debug).not.toHaveBeenCalledWith(expect.stringContaining('restricted_field_probe'))
	})

	it('fails closed with the opaque core error body when stripping throws', async () => {
		const req = makeReq()
		req.restrictedFields.add(['orders'])
		const { res, sent } = makeRes()

		await restrictedFieldsGuard(req, res, jest.fn())

		const body: any = { products: [{}] }
		Object.defineProperty(body.products[0], 'boom', {
			enumerable: true,
			get() {
				throw new Error('exotic getter')
			}
		})
		res.json(body)

		expect(sent.status).toBe(500)
		expect(sent.body).toEqual({ code: 'unknown_error', type: 'unknown_error', message: 'An unknown error occurred.' })
		expect(error).toHaveBeenCalledWith(expect.stringContaining('restricted-field strip failed'))
	})
})
