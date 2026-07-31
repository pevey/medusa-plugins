// Guards the browser shims against drift in Medusa's real validators (createFindParams,
// createSelectParams, createOperatorMap, applyAndAndOrOperators). If Medusa changes any of their
// defaults or coercion, this fails loudly here rather than letting every plugin's contract tests
// validate against a stale approximation.
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createFindParams as real, createSelectParams as realSelect, createOperatorMap as realOperatorMap } from '@medusajs/medusa/api/utils/validators'
import { applyAndAndOrOperators as realAndAndOr } from '@medusajs/medusa/api/utils/common-validators/index'
import { createFindParams as shim, createSelectParams as shimSelect, createOperatorMap as shimOperatorMap } from '../../shims/medusa-validators.js'
import { applyAndAndOrOperators as shimAndAndOr } from '../../shims/medusa-common-validators.js'

const SAMPLES: Array<Record<string, unknown>> = [
	{},
	{ limit: '5' },
	{ offset: '10' },
	{ limit: 5, offset: 10 },
	{ fields: 'id,name' },
	{ order: '-created_at' },
	{ fields: 'id', limit: '1', offset: '2', order: 'name' },
	// `with_deleted` has its own string→boolean preprocess in the real implementation. Without a
	// sample carrying it, that whole branch is unreachable and could drift unnoticed.
	{ with_deleted: 'true' },
	{ with_deleted: 'false' },
	{ with_deleted: true }
]

const OPTIONS: Array<Parameters<typeof shim>[0]> = [
	undefined,
	{ limit: 20, offset: 0 },
	{ limit: 15, offset: 0 },
	{ limit: 50, offset: 0 },
	// The real implementation branches `order` on truthiness, defaulting only when options supply
	// one. No options entry above carries `order`, so that branch would otherwise go unchecked.
	{ limit: 20, offset: 0, order: 'created_at' }
]

describe('createFindParams shim equivalence', () => {
	for (const options of OPTIONS) {
		for (const sample of SAMPLES) {
			it(`matches for options=${JSON.stringify(options)} input=${JSON.stringify(sample)}`, () => {
				const realResult = real(options as never).safeParse(sample)
				const shimResult = shim(options).safeParse(sample)
				expect(shimResult.success).toBe(realResult.success)
				if (realResult.success && shimResult.success) {
					expect(shimResult.data).toEqual(realResult.data)
				}
			})
		}
	}
})

describe('createSelectParams shim equivalence', () => {
	const selectSamples = [{}, { fields: 'id,name' }, { fields: '*addresses' }, { garbage: true }]
	for (const sample of selectSamples) {
		it(`matches for input=${JSON.stringify(sample)}`, () => {
			const realResult = realSelect().safeParse(sample)
			const shimResult = shimSelect().safeParse(sample)
			expect(shimResult.success).toBe(realResult.success)
			if (realResult.success && shimResult.success) {
				expect(shimResult.data).toEqual(realResult.data)
			}
		})
	}
})

describe('createOperatorMap shim equivalence', () => {
	const operatorSamples: unknown[] = [
		undefined,
		'active',
		['active', 'restricted'],
		{ $eq: 'active' },
		{ $in: ['active', 'restricted'] },
		{ $gte: '2026-01-01', $lte: '2026-12-31' },
		{ $like: '%foo%' }
	]
	for (const sample of operatorSamples) {
		it(`matches for input=${JSON.stringify(sample)}`, () => {
			const realResult = realOperatorMap().safeParse(sample)
			const shimResult = shimOperatorMap().safeParse(sample)
			expect(shimResult.success).toBe(realResult.success)
			if (realResult.success && shimResult.success) {
				expect(shimResult.data).toEqual(realResult.data)
			}
		})
	}
})

describe('applyAndAndOrOperators shim equivalence', () => {
	const base = z.object({ status: z.string().optional() })
	const andOrSamples = [{ status: 'active' }, { status: 'active', $and: [{ status: 'restricted' }] }, { $or: [{ status: 'a' }, { status: 'b' }] }]
	for (const sample of andOrSamples) {
		it(`matches for input=${JSON.stringify(sample)}`, () => {
			const realResult = realAndAndOr(base).safeParse(sample)
			const shimResult = shimAndAndOr(base).safeParse(sample)
			expect(shimResult.success).toBe(realResult.success)
			if (realResult.success && shimResult.success) {
				expect(shimResult.data).toEqual(realResult.data)
			}
		})
	}
})
