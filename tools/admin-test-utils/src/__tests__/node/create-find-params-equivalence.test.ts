// Guards the browser shim against drift in Medusa's real createFindParams. If Medusa changes
// its defaults or coercion, this fails loudly here rather than letting every plugin's contract
// tests validate against a stale approximation.
import { describe, it, expect } from 'vitest'
import { createFindParams as real } from '@medusajs/medusa/api/utils/validators'
import { createFindParams as shim } from '../../shims/medusa-validators.js'

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
