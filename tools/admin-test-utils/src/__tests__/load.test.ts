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
