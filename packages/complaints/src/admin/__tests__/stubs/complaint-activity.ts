// Browser-test stand-in for `../../modules/complaint/models/complaint-activity.ts`, aliased in by
// `vitest.config.ts`. Same reasoning as `./complaint.ts`: `validators.ts` only needs the plain
// `ComplaintActivityType` enum, but the real file's `import { model } from '@medusajs/framework/utils'`
// (for the DML model definition) drags in jsonwebtoken/jws (-> util.inherits), which crashes the
// browser test bundle. This stub mirrors just the enum's string values.
export enum ComplaintActivityType {
	OPEN = 'open',
	CLOSE = 'close',
	NOTE = 'note'
}
