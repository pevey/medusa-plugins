// Browser-test stand-in for `../../modules/veeqo/models/veeqo-order.ts`, aliased in by
// `vitest.config.ts`. `validators.ts` only needs the plain `SourceType` enum, but the real file's
// `import { model } from '@medusajs/framework/utils'` (for the DML model definition) drags in
// jsonwebtoken/jws (-> util.inherits), which crashes the browser test bundle -- the same crash
// class the admin-test-utils README documents for a route.ts. This stub mirrors just the enum
// `validators.ts` reads (`Status` is also exported by the real file, but nothing outside it
// references that one -- omitted here since only `SourceType` needs to survive the alias).
export enum SourceType {
	ORDER_PLACED = 'order_placed',
	CLAIM = 'claim',
	EXCHANGE = 'exchange'
}
