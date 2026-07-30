import { describe, it, expect } from 'vitest'
import { loadRouteContracts } from '../contracts/load.js'
import { createContractFake } from '../fake-sdk.js'
import { defineMiddlewares, validateAndTransformQuery } from '../shims/framework-http.js'
import { createFindParams } from '../shims/medusa-validators.js'
import arrayForm from './fixtures/array-form.js'

const contracts = loadRouteContracts(arrayForm)

const build = () =>
	createContractFake({
		contracts,
		responders: {
			'GET /admin/things': () => ({
				things: [{ id: 'thing_1', name: 'One', created_at: '2026-01-01', secret: 'nope' }],
				count: 1
			}),
			'DELETE /admin/things': () => ({ deleted: ['thing_1'] }),
			'POST /admin/things/approve': () => ({ approved: ['thing_1'] })
		}
	})

describe('createContractFake', () => {
	it('returns the responder payload for a valid request', async () => {
		const fake = build()
		const result = (await fake.fetch('/admin/things', { query: { q: 'abc' } })) as {
			count: number
		}
		expect(result.count).toBe(1)
	})

	it('records every call', async () => {
		const fake = build()
		await fake.fetch('/admin/things', { query: { q: 'abc' } })
		expect(fake.calls).toEqual([{ method: 'GET', path: '/admin/things', query: { q: 'abc' }, body: undefined }])
	})

	it('rejects a query the real schema refuses', async () => {
		const fake = build()
		await expect(fake.fetch('/admin/things', { query: { q: 123 } })).rejects.toThrow(/GET \/admin\/things/)
	})

	it('rejects a body the real schema refuses', async () => {
		const fake = build()
		await expect(fake.fetch('/admin/things', { method: 'DELETE', body: { ids: [] } })).rejects.toThrow(/DELETE \/admin\/things/)
	})

	it('rejects an unknown path so route renames cannot pass silently', async () => {
		const fake = build()
		await expect(fake.fetch('/admin/thingz')).rejects.toThrow(/no route/i)
	})

	it('strips response fields that queryConfig.defaults does not include', async () => {
		const fake = build()
		const result = (await fake.fetch('/admin/things')) as {
			things: Array<Record<string, unknown>>
		}
		expect(result.things[0]).toEqual({ id: 'thing_1', name: 'One', created_at: '2026-01-01' })
		expect(result.things[0]).not.toHaveProperty('secret')
	})

	it('passes path params to the responder', async () => {
		const fake = createContractFake({
			contracts,
			responders: {
				'DELETE /admin/things/:id': ({ params }) => ({ id: params.id, deleted: true })
			}
		})
		const result = (await fake.fetch('/admin/things/thing_9', { method: 'DELETE' })) as {
			id: string
		}
		expect(result.id).toBe('thing_9')
	})

	it('fails loudly when a matched route has no responder', async () => {
		const fake = createContractFake({ contracts, responders: {} })
		await expect(fake.fetch('/admin/things')).rejects.toThrow(/no responder/i)
	})

	it('awaits an async responder instead of projecting the Promise to {}', async () => {
		const fake = createContractFake({
			contracts,
			responders: {
				'GET /admin/things': async () => ({
					things: [{ id: 'thing_1', name: 'One', created_at: '2026-01-01' }],
					count: 1
				})
			}
		})
		const result = (await fake.fetch('/admin/things')) as {
			things: Array<Record<string, unknown>>
			count: number
		}
		expect(result.count).toBe(1)
		expect(result.things[0]).toEqual({ id: 'thing_1', name: 'One', created_at: '2026-01-01' })
	})
})

// A route whose validator is the real `createFindParams()` — the shape every list route in
// every plugin actually uses. The fixture's own `GetThings` schema has no defaults, so it
// cannot show whether validated query defaults reach the responder at all.
const paginated = loadRouteContracts(
	defineMiddlewares([
		{
			matcher: '/admin/paged',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(createFindParams(), {
					defaults: ['id', 'name'],
					isList: true
				})
			]
		}
	])
)

describe('createContractFake query handling', () => {
	const pagedFake = (seen?: Array<Record<string, unknown>>) =>
		createContractFake({
			contracts: paginated,
			responders: {
				'GET /admin/paged': ({ query }) => {
					seen?.push(query)
					return { items: [{ id: 'p_1', name: 'One', secret: 'nope' }], count: 1 }
				}
			}
		})

	it('applies schema defaults, so the responder sees what the API would see', async () => {
		const seen: Array<Record<string, unknown>> = []
		await pagedFake(seen).fetch('/admin/paged', { query: {} })
		expect(seen[0]).toEqual({ limit: 20, offset: 0 })
	})

	it('projects through queryConfig.defaults when no fields are requested', async () => {
		const result = (await pagedFake().fetch('/admin/paged')) as {
			items: Array<Record<string, unknown>>
		}
		expect(result.items[0]).toEqual({ id: 'p_1', name: 'One' })
	})

	it('honors an explicit fields list, which replaces the defaults', async () => {
		const result = (await pagedFake().fetch('/admin/paged', { query: { fields: 'id' } })) as {
			items: Array<Record<string, unknown>>
		}
		expect(result.items[0]).toEqual({ id: 'p_1' })
	})

	it('applies +/- field deltas over the defaults', async () => {
		const added = (await pagedFake().fetch('/admin/paged', { query: { fields: '+secret' } })) as {
			items: Array<Record<string, unknown>>
		}
		expect(added.items[0]).toEqual({ id: 'p_1', name: 'One', secret: 'nope' })

		const removed = (await pagedFake().fetch('/admin/paged', { query: { fields: '-name' } })) as {
			items: Array<Record<string, unknown>>
		}
		expect(removed.items[0]).toEqual({ id: 'p_1' })
	})

	it('throws on a fields list it cannot interpret rather than answering generously', async () => {
		await expect(pagedFake().fetch('/admin/paged', { query: { fields: 'id,,name' } })).rejects.toThrow(/empty entry/i)
		await expect(pagedFake().fetch('/admin/paged', { query: { fields: '-id,-name' } })).rejects.toThrow(/no fields at all/i)
	})
})
