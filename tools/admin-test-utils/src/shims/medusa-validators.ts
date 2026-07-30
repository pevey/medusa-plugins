// Browser-safe stand-in for `@medusajs/medusa/api/utils/validators`.
// Equivalence with the real implementation is asserted by
// src/__tests__/node/create-find-params-equivalence.test.ts, which runs in Node and
// imports both. If Medusa changes createFindParams, that guard fails — not the
// plugin contract tests, which would otherwise go quietly wrong.
import { z } from 'zod'

export type FindParamsOptions = {
	limit?: number
	offset?: number
	order?: string
}

// Mirrors the real implementation shape-for-shape: `parseInt` preprocessing (NOT
// `z.coerce.number()`, which would keep the decimal in '5.5'), defaults applied
// unconditionally via `?? 0` / `?? 20`, `order` defaulted on truthiness, and the
// `with_deleted` string-to-boolean coercion. The equivalence guard compares the two
// directly, so any drift here fails there.
const numeric = (fallback: number) => z.preprocess(val => (val && typeof val === 'string' ? parseInt(val) : val), z.number().optional().default(fallback))

export function createFindParams(options: FindParamsOptions = {}) {
	const { limit, offset, order } = options
	return z.object({
		fields: z.string().optional(),
		offset: numeric(offset ?? 0),
		limit: numeric(limit ?? 20),
		order: order ? z.string().optional().default(order) : z.string().optional(),
		with_deleted: z.preprocess(val => {
			if (val && typeof val === 'string') {
				return val === 'true' ? true : val === 'false' ? false : val
			}
			return val
		}, z.boolean().optional())
	})
}
