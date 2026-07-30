import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery, authenticate } from '../shims/framework-http.js'
import { createFindParams } from '../shims/medusa-validators.js'

describe('framework-http shim', () => {
	it('normalizes `method` to `methods` and preserves unknown keys', () => {
		const result = defineMiddlewares([{ matcher: '/admin/things', method: ['GET'], middlewares: [], policies: ['read'] }])
		expect(result.routes[0].methods).toEqual(['GET'])
		expect(result.routes[0]).not.toHaveProperty('method')
		expect(result.routes[0].policies).toEqual(['read'])
	})

	it('accepts the object form', () => {
		const result = defineMiddlewares({
			routes: [{ matcher: '/admin/things', method: ['GET'], middlewares: [] }]
		})
		expect(result.routes).toHaveLength(1)
	})

	it('leaves `methods` undefined for catch-all entries', () => {
		const result = defineMiddlewares([{ matcher: '/admin/*', middlewares: [] }])
		expect(result.routes[0].methods).toBeUndefined()
	})

	it('tags the body validator with its live schema', () => {
		const schema = z.object({ ids: z.array(z.string()).min(1) })
		const tagged = validateAndTransformBody(schema) as unknown as {
			__kind: string
			__schema: typeof schema
		}
		expect(tagged.__kind).toBe('body')
		expect(tagged.__schema).toBe(schema)
		expect(tagged.__schema.safeParse({ ids: [] }).success).toBe(false)
	})

	it('tags the query validator with its schema and queryConfig', () => {
		const schema = z.object({ q: z.string().optional() })
		const queryConfig = { defaults: ['id', 'name'], isList: true, defaultLimit: 20 }
		const tagged = validateAndTransformQuery(schema, queryConfig) as unknown as {
			__kind: string
			__schema: typeof schema
			__queryConfig: typeof queryConfig
		}
		expect(tagged.__kind).toBe('query')
		expect(tagged.__schema).toBe(schema)
		expect(tagged.__queryConfig).toBe(queryConfig)
	})

	it('stubs authenticate without throwing', () => {
		expect(() => authenticate('customer', 'bearer')).not.toThrow()
	})
})

describe('createFindParams shim', () => {
	it('supplies limit/offset defaults when given', () => {
		const parsed = createFindParams({ limit: 20, offset: 0 }).parse({})
		expect(parsed.limit).toBe(20)
		expect(parsed.offset).toBe(0)
	})

	it("applies Medusa's own defaults when called bare", () => {
		// Real `createFindParams()` defaults to `offset ?? 0` / `limit ?? 20` unconditionally —
		// the caller's options only change WHICH default, never WHETHER there is one. Every
		// plugin in this repo calls it bare, so this is the path that matters most.
		const parsed = createFindParams().parse({})
		expect(parsed.limit).toBe(20)
		expect(parsed.offset).toBe(0)
	})

	it('coerces with_deleted the way the real schema does', () => {
		expect(createFindParams().parse({ with_deleted: 'true' }).with_deleted).toBe(true)
		expect(createFindParams().parse({ with_deleted: 'false' }).with_deleted).toBe(false)
		expect(createFindParams().parse({}).with_deleted).toBeUndefined()
	})

	it('truncates decimal strings like the real preprocess does', () => {
		// Real uses `parseInt`, not `z.coerce.number()` — '5.5' is 5, not 5.5.
		expect(createFindParams().parse({ limit: '5.5' }).limit).toBe(5)
	})

	it('coerces numeric strings, as query params always arrive as strings', () => {
		const parsed = createFindParams({ limit: 20, offset: 0 }).parse({ limit: '5', offset: '10' })
		expect(parsed.limit).toBe(5)
		expect(parsed.offset).toBe(10)
	})

	it('accepts fields and order', () => {
		const parsed = createFindParams().parse({ fields: 'id,name', order: '-created_at' })
		expect(parsed.fields).toBe('id,name')
		expect(parsed.order).toBe('-created_at')
	})
})
