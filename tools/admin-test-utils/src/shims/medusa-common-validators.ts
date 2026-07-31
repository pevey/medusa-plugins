// Browser-safe stand-in for `@medusajs/medusa/api/utils/common-validators/index`, aliased in by
// `defineAdminTestConfig`. The real module's `index.js` re-exports `./common` (pure zod, safe to
// execute) AND `./products` (which imports `@medusajs/framework/utils` -> jsonwebtoken -> jws,
// which calls `util.inherits` -- undefined once Vite externalizes Node's `util` for the browser
// test environment, crashing the whole suite import). A plugin's validators.ts only ever reaches
// for `applyAndAndOrOperators` from the safe half, so that is the only export mirrored here.
//
// Equivalence with the real implementation is asserted by
// src/__tests__/node/create-find-params-equivalence.test.ts, which runs in Node and imports both.
import { z } from 'zod'

// Mirrors the real implementation shape-for-shape: merges `$and`/`$or` array-of-self operators
// onto the given schema.
export function applyAndAndOrOperators<T extends z.ZodObject<any>>(schema: T) {
	return schema.merge(
		z.object({
			$and: z.lazy(() => schema.array()).optional(),
			$or: z.lazy(() => schema.array()).optional()
		})
	)
}
