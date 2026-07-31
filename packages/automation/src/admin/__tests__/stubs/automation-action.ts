// Browser-test stand-in for `../../modules/automation/models/automation-action.ts` -- see
// `./automation-trigger.ts` for why. `validators.ts` only needs `AutomationActionType` and
// `AutomationRequestMethod`.
export enum AutomationActionType {
	OUTGOING_WEBHOOK = 'outgoing_webhook',
	OUTGOING_REQUEST = 'outgoing_request',
	MEDUSA_WORKFLOW = 'medusa_workflow'
}

export enum AutomationRequestMethod {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE'
}
