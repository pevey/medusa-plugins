// Browser-test stand-in for `../../modules/complaint/models/complaint.ts`, aliased in by
// `vitest.config.ts`. The real file's only export `validators.ts` needs is the plain
// `ComplaintStatus` enum -- but the file also does `import { model } from '@medusajs/framework/utils'`
// to define the DML model, and that barrel import drags in jsonwebtoken/jws (-> util.inherits),
// which crashes once Vite externalizes Node's `util` for the browser test environment (the same
// crash class the admin-test-utils README documents for a route.ts). Contract validation never
// needs the DML model, only the enum's string values, so this stub mirrors just that.
export enum ComplaintStatus {
	OPEN = 'open',
	CLOSED = 'closed'
}
