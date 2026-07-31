// Browser-test stand-in for `../../modules/automation/models/automation-delivery.ts` -- see
// `./automation-trigger.ts` for why. `validators.ts` only needs `AutomationDeliveryStatus`.
export enum AutomationDeliveryStatus {
	PENDING = 'pending',
	SUCCESS = 'success',
	FAILED = 'failed'
}
