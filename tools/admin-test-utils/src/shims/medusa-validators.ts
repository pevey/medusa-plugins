// Browser-safe stand-in for `@medusajs/medusa/api/utils/validators`.
// Equivalence with the real implementation (createFindParams, createSelectParams,
// createOperatorMap) is asserted by src/__tests__/node/create-find-params-equivalence.test.ts,
// which runs in Node and imports both. If Medusa changes any of them, that guard fails — not the
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

// Mirrors the real implementation shape-for-shape: just `{ fields }`. The real `createFindParams`
// is itself built on top of this (`createSelectParams().merge(...)`); this shim's `createFindParams`
// above declares `fields` inline instead for historical reasons, but the two are equivalent in
// shape, and this is exported separately because plugins call it directly for detail/select-only
// routes (`createSelectParams()` with no `.extend()`).
export function createSelectParams() {
	return z.object({
		fields: z.string().optional()
	})
}

// Mirrors the real implementation shape-for-shape: an optional bare value/array union, OR an
// object of `$eq`/`$ne`/`$in`/`$nin`/`$like`/`$ilike`/`$re`/`$contains`/`$gt`/`$gte`/`$lt`/`$lte`
// operators over that same union. Used for filterable date/scalar fields
// (`created_at: createOperatorMap().optional()`).
export function createOperatorMap(type: z.ZodTypeAny = z.string(), valueParser?: (val: unknown) => unknown) {
	const simpleType = valueParser ? z.preprocess(valueParser, type).optional() : type.optional()
	const arrayType = z.array(type).optional()
	const unionType = z.union([simpleType, arrayType]).optional()
	return z.union([
		unionType,
		z.object({
			$eq: unionType,
			$ne: unionType,
			$in: arrayType,
			$nin: arrayType,
			$like: simpleType,
			$ilike: simpleType,
			$re: simpleType,
			$contains: simpleType,
			$gt: simpleType,
			$gte: simpleType,
			$lt: simpleType,
			$lte: simpleType
		})
	])
}
