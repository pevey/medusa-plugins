import { describe, it, expect } from 'vitest'
import { loadRouteContracts } from '../contracts/load.js'
import arrayForm, { GetThings, DeleteThings } from './fixtures/array-form.js'
import objectForm, { CreateWidget } from './fixtures/object-form.js'

describe('loadRouteContracts', () => {
	const contracts = loadRouteContracts(arrayForm)

	it('exposes the live query schema and queryConfig', () => {
		const contract = contracts.get('GET', '/admin/things')
		expect(contract?.querySchema).toBe(GetThings)
		expect(contract?.queryConfig?.defaults).toEqual(['id', 'name', 'created_at'])
		expect(contract?.queryConfig?.defaultLimit).toBe(20)
		expect(contract?.queryConfig?.isList).toBe(true)
	})

	it('exposes the live body schema', () => {
		expect(contracts.get('DELETE', '/admin/things')?.bodySchema).toBe(DeleteThings)
	})

	it('separates contracts by method on the same matcher', () => {
		expect(contracts.get('GET', '/admin/things')?.bodySchema).toBeUndefined()
		expect(contracts.get('DELETE', '/admin/things')?.querySchema).toBeUndefined()
	})

	it('treats a route with an empty middleware array as a known route with no contract', () => {
		const contract = contracts.get('DELETE', '/admin/things/thing_1')
		expect(contract).toBeDefined()
		expect(contract?.bodySchema).toBeUndefined()
		expect(contract?.querySchema).toBeUndefined()
	})

	it('resolves an action route ahead of the parameterized sibling', () => {
		expect(contracts.get('POST', '/admin/things/approve')?.matcher).toBe('/admin/things/approve')
	})

	it('skips entries with no methods', () => {
		expect(contracts.all().some(c => c.matcher === '/admin/*')).toBe(false)
	})

	it('keeps store routes out of the way but still loadable', () => {
		expect(contracts.get('GET', '/store/things/thing_1')).toBeDefined()
	})

	it('returns undefined for an unknown path', () => {
		expect(contracts.get('GET', '/admin/nope')).toBeUndefined()
	})

	it('is case-insensitive on the method', () => {
		expect(contracts.get('get', '/admin/things')).toBeDefined()
	})

	it('reads the object form of defineMiddlewares', () => {
		expect(loadRouteContracts(objectForm).get('POST', '/admin/widgets')?.bodySchema).toBe(CreateWidget)
	})

	it('accepts a bare array of already-normalized route entries', () => {
		const nested = loadRouteContracts(arrayForm.routes)
		expect(nested.get('GET', '/admin/things')).toBeDefined()
	})

	it('unwraps an ES module namespace, the shape `await import()` actually returns', () => {
		// This is how a plugin's real middlewares.ts arrives: `await import('.../middlewares.js')`
		// yields `{ default: <the defineMiddlewares result> }`. If the unwrap breaks, the loader
		// returns an EMPTY map rather than throwing, and every contract test downstream passes
		// vacuously — the exact failure this harness exists to prevent.
		const asModule = { default: arrayForm }
		const contract = loadRouteContracts(asModule).get('GET', '/admin/things')
		expect(contract).toBeDefined()
		expect(contract?.querySchema).toBe(GetThings)
	})
})

describe('loadRouteContracts with routeModules', () => {
	it('is optional — calling with no second argument behaves exactly as before', () => {
		const contract = loadRouteContracts(arrayForm).get('GET', '/admin/things')
		expect(contract?.querySchema).toBe(GetThings)
	})

	it('derives a one-param matcher from the glob key', () => {
		const routeModules = {
			'../../api/admin/reviews/[id]/route.ts': { GET: function GET() {} }
		}
		const contracts = loadRouteContracts({ routes: [] }, { routeModules })
		expect(contracts.get('GET', '/admin/reviews/rev_1')?.matcher).toBe('/admin/reviews/:id')
	})

	it('derives a two-param matcher from the glob key', () => {
		const routeModules = {
			'../../api/admin/forms/[id]/fields/[fieldId]/route.ts': { POST: function POST() {} }
		}
		const contracts = loadRouteContracts({ routes: [] }, { routeModules })
		expect(contracts.get('POST', '/admin/forms/form_1/fields/fld_1')?.matcher).toBe('/admin/forms/:id/fields/:fieldId')
	})

	it('registers one contract per exported verb on a module exporting multiple', () => {
		const routeModules = {
			'../../api/admin/widgets/route.ts': { GET: function GET() {}, POST: function POST() {} }
		}
		const contracts = loadRouteContracts({ routes: [] }, { routeModules })
		expect(contracts.get('GET', '/admin/widgets')).toBeDefined()
		expect(contracts.get('POST', '/admin/widgets')).toBeDefined()
	})

	it('skips a module exporting no HTTP verbs', () => {
		const routeModules = {
			'../../api/admin/widgets/helpers.ts': { formatWidget: function formatWidget() {} }
		}
		const contracts = loadRouteContracts({ routes: [] }, { routeModules })
		expect(contracts.all()).toHaveLength(0)
	})

	it('lets the middlewares.ts schema win when the same route is present in both sources, with no duplicate', () => {
		const routeModules = {
			'../../api/admin/things/route.ts': { GET: function GET() {} }
		}
		const contracts = loadRouteContracts(arrayForm, { routeModules })
		const forMethod = contracts.all().filter(c => c.method === 'GET' && c.matcher === '/admin/things')
		expect(forMethod).toHaveLength(1)
		expect(forMethod[0]?.querySchema).toBe(GetThings)
	})

	it('resolves a glob-only route to a contract with no schema', () => {
		const routeModules = {
			'../../api/admin/reviews/[id]/route.ts': { DELETE: function DELETE() {} }
		}
		const contracts = loadRouteContracts({ routes: [] }, { routeModules })
		const contract = contracts.get('DELETE', '/admin/reviews/rev_1')
		expect(contract).toBeDefined()
		expect(contract?.bodySchema).toBeUndefined()
		expect(contract?.querySchema).toBeUndefined()
	})

	// A real plugin route.ts pulls in @medusajs/framework/utils -> jsonwebtoken -> jws, which calls
	// util.inherits and crashes an eager module import in the browser. `setup.ts` therefore passes
	// import.meta.glob(..., { query: '?raw', import: 'default' }) — raw source text, never executed
	// — and loadRouteContracts recovers the verbs by regex. These cases exercise that string branch,
	// standing in for what the real glob actually hands the loader.
	describe('reading raw source text (the real glob shape)', () => {
		it('derives a one-param matcher and its verb from raw source', () => {
			const routeModules = {
				'../../api/admin/reviews/[id]/route.ts': `
					import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
					export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {}
				`
			}
			const contracts = loadRouteContracts({ routes: [] }, { routeModules })
			expect(contracts.get('GET', '/admin/reviews/rev_1')?.matcher).toBe('/admin/reviews/:id')
		})

		it('registers one contract per verb exported as `export const` in raw source', () => {
			const routeModules = {
				'../../api/admin/reviews/[id]/route.ts': `
					export const GET = async () => {}
					export const POST = async () => {}
					export const DELETE = async () => {}
				`
			}
			const contracts = loadRouteContracts({ routes: [] }, { routeModules })
			expect(contracts.get('GET', '/admin/reviews/rev_1')).toBeDefined()
			expect(contracts.get('POST', '/admin/reviews/rev_1')).toBeDefined()
			expect(contracts.get('DELETE', '/admin/reviews/rev_1')).toBeDefined()
		})

		it('skips raw source exporting no HTTP verbs', () => {
			const routeModules = {
				'../../api/admin/widgets/helpers.ts': `export function formatWidget() { return null }`
			}
			const contracts = loadRouteContracts({ routes: [] }, { routeModules })
			expect(contracts.all()).toHaveLength(0)
		})

		it('never executes the source, so an import of a nonexistent package does not throw', () => {
			const routeModules = {
				'../../api/admin/reviews/[id]/route.ts': `
					import { REVIEW_MODULE } from 'a-package-that-does-not-exist'
					export const DELETE = async () => {}
				`
			}
			expect(() => loadRouteContracts({ routes: [] }, { routeModules })).not.toThrow()
		})
	})
})
