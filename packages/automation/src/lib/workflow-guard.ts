// Blocks destructive Medusa workflows from being executed via automation actions.
//
// The check is intentionally a coarse substring match: any workflow whose name
// contains 'delete' (case-insensitive) is rejected. This catches every
// core-flows export of the form `delete*Workflow` and any third-party workflow
// that follows the same naming convention.
//
// Defense in depth — the admin UI's curated workflow list also excludes
// delete-prefixed workflows, but if a row is somehow inserted directly into
// the DB or via a bypassed API, the dispatcher refuses to run it.

const BLOCKED_NAME_PATTERN = /delete/i

export function isBlockedWorkflowName(name: string | null | undefined): boolean {
	if (!name) return false
	return BLOCKED_NAME_PATTERN.test(name)
}
