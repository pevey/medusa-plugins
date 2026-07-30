import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { loadRouteContracts } from '../contracts/load.js'
import { assertContractInvariants } from '../contracts/invariants.js'
import { defineMiddlewares, validateAndTransformQuery } from '../shims/framework-http.js'
import { createFindParams } from '../shims/medusa-validators.js'
import arrayForm, { GetThings, DeleteThings, ApproveThings } from './fixtures/array-form.js'

const contracts = loadRouteContracts(arrayForm)

describe('assertContractInvariants', () => {
	it('passes when every exported validator is wired to a route', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators: { GetThings, DeleteThings, ApproveThings }
			})
		).not.toThrow()
	})

	it('fails when a validator is exported but never wired', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators: { GetThings, DeleteThings, ApproveThings, OrphanSchema: z.object({}) }
			})
		).toThrow(/OrphanSchema/)
	})

	it('ignores the co-located `*Type` exports', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators: { GetThings, DeleteThings, ApproveThings, GetThingsType: undefined }
			})
		).not.toThrow()
	})

	it('fails when the UI declares a field the route does not return', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators: { GetThings, DeleteThings, ApproveThings },
				declaredFields: { 'GET /admin/things': ['id', 'name', 'nonexistent_field'] }
			})
		).toThrow(/nonexistent_field/)
	})

	it('passes when declared fields are a subset of the route defaults', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators: { GetThings, DeleteThings, ApproveThings },
				declaredFields: { 'GET /admin/things': ['id', 'name'] }
			})
		).not.toThrow()
	})
})

// The fixture's `GetThings` schema has no `limit` field at all, so it can never exercise the
// defaultLimit invariant — that check would read as coverage while never running. These build
// routes on the real `createFindParams`, the way every plugin list route does.
const pagedContracts = (options: { limit?: number }, defaultLimit: number) =>
	loadRouteContracts(
		defineMiddlewares([
			{
				matcher: '/admin/paged',
				method: ['GET'],
				middlewares: [
					validateAndTransformQuery(createFindParams(options), {
						defaults: ['id'],
						isList: true,
						defaultLimit
					})
				]
			}
		])
	)

describe('assertContractInvariants defaultLimit agreement', () => {
	it('passes when queryConfig.defaultLimit matches the schema default', () => {
		expect(() =>
			assertContractInvariants({ contracts: pagedContracts({ limit: 20 }, 20), validators: {} })
		).not.toThrow()
	})

	it('fails when queryConfig.defaultLimit disagrees with the schema default', () => {
		expect(() =>
			assertContractInvariants({ contracts: pagedContracts({ limit: 15 }, 20), validators: {} })
		).toThrow(/defaultLimit is 20 but the schema defaults limit to 15/)
	})
})
