// Browser-test stand-in for `../../modules/automation/models/automation-trigger.ts`, aliased in
// by `vitest.config.ts`. `validators.ts` only needs the plain `AutomationTriggerType` enum, but
// the real file's `import { model } from '@medusajs/framework/utils'` (for the DML model
// definition) drags in jsonwebtoken/jws (-> util.inherits), which crashes the browser test bundle
// -- the same crash class the admin-test-utils README documents for a route.ts. This stub mirrors
// just the enum `validators.ts` reads.
export enum AutomationTriggerType {
	MEDUSA_EVENT = 'medusa_event',
	INCOMING_WEBHOOK = 'incoming_webhook'
}
