import { getCallerFilePath, isFileDisabled, MEDUSA_SKIP_FILE, toSnakeCase } from '@medusajs/framework/utils'

export const AccessPolicySymbol = Symbol.for('AccessPolicy')

/**
 * The single character used as the wildcard across both resource and operation
 * slots. All access-policy code that reads/writes/compares the wildcard imports this.
 */
export const WILDCARD = '*'

export interface PolicyDefinition {
	name: string
	resource: string
	operation: string
	description?: string
}

export interface definePoliciesExport {
	[AccessPolicySymbol]: boolean
	policies: PolicyDefinition[]
}

/**
 * A policy whose operation fell outside {@link CLOSED_OPERATIONS} and was
 * therefore never registered. Collected rather than thrown on: the offending
 * declaration usually belongs to a third-party plugin the operator does not
 * control, and taking the application down at boot is a worse outcome than a
 * named line in the startup report.
 */
export type DiscardedPolicy = {
	name: string
	/** Resource and operation exactly as the author wrote them. */
	resource: string
	operation: string
	/** Normalized `resource:operation` — the grant this would have become. */
	key: string
	/**
	 * Why it was refused, so the boot report can say something true about each
	 * case rather than describing every discard as a bad operation.
	 */
	reason: 'operation' | 'incomplete'
	/** File that called {@link definePolicies}, when the framework resolved one. */
	declaredIn?: string
}

declare global {
	// eslint-disable-next-line no-var
	var AccessPolicy: Record<string, { resource: string; operation: string; description?: string }> | undefined
	// eslint-disable-next-line no-var
	var AccessPolicyResource: Record<string, string> | undefined
	// eslint-disable-next-line no-var
	var AccessPolicyOperation: (Record<string, string> & { ALL: string }) | undefined
	// eslint-disable-next-line no-var
	var AccessDiscardedPolicies: DiscardedPolicy[] | undefined
}

type DefaultPolicyResources = Record<string, string>

const PolicyResource: DefaultPolicyResources & Record<string, string> = global.AccessPolicyResource ?? {}
global.AccessPolicyResource ??= PolicyResource

/**
 * The complete set of operations a grant may use. Closed by design: domain
 * verbs (approve, publish, cancel) are modelled as `update`, so a novel
 * operation is a typo far more often than an intent.
 */
export const CLOSED_OPERATIONS = ['read', 'create', 'update', 'delete', 'export', WILDCARD] as const

const PolicyOperation: Record<string, string> & {
	readonly read: 'read'
	readonly create: 'create'
	readonly update: 'update'
	readonly delete: 'delete'
	readonly export: 'export'
	readonly '*': '*'
	readonly ALL: '*'
} = (global.AccessPolicyOperation as any) ?? { ALL: WILDCARD }

const normalizeKey = (element: string) => (element === WILDCARD ? WILDCARD : toSnakeCase(element))

for (const operation of CLOSED_OPERATIONS) {
	const operationKey = normalizeKey(operation)
	PolicyOperation[operationKey] = operation
}
global.AccessPolicyOperation ??= PolicyOperation

global.AccessDiscardedPolicies ??= []

/** Policies refused registration this process, deduped by normalized key. */
export function listDiscardedPolicies(): DiscardedPolicy[] {
	return [...(global.AccessDiscardedPolicies ?? [])]
}

/**
 * An out-of-set operation dedupes on the key alone: HMR and repeated imports
 * re-run declaration, and one stranded grant is one finding however many
 * declarations produced it. An incomplete declaration strands no grant at all —
 * there is nothing for a route to require — so it dedupes per declaration, or
 * two different broken definitions with the same empty field would report once.
 */
const dedupeKeyFor = (discarded: DiscardedPolicy): string =>
	discarded.reason === 'incomplete' ? `incomplete:${discarded.name}:${discarded.resource}:${discarded.operation}` : `operation:${discarded.key}`

function recordDiscardedPolicy(discarded: DiscardedPolicy): void {
	const collected = (global.AccessDiscardedPolicies ??= [])
	const key = dedupeKeyFor(discarded)
	if (collected.some(existing => dedupeKeyFor(existing) === key)) {
		return
	}
	collected.push(discarded)
}

const Policy: Record<string, { resource: string; operation: string; description?: string }> = global.AccessPolicy ?? {}
global.AccessPolicy ??= Policy

/**
 * Define access-control policies, synced to the DB when the app starts
 * on `onApplicationStart`. Registers into the independent Access* registries.
 *
 * An operation outside {@link CLOSED_OPERATIONS} discards the policy rather than
 * throwing; see {@link listDiscardedPolicies}.
 */
export function definePolicies(policies: PolicyDefinition | PolicyDefinition[]): definePoliciesExport {
	const callerFilePath = getCallerFilePath()
	if (isFileDisabled(callerFilePath ?? '')) {
		return { [MEDUSA_SKIP_FILE]: true } as any
	}

	const policiesArray = Array.isArray(policies) ? policies : [policies]

	const accepted: PolicyDefinition[] = []

	for (const policy of policiesArray) {
		// An incomplete declaration is as unholdable as one with a bad operation,
		// and just as likely to come from a third-party plugin the operator does not
		// control — so it takes the same discard-and-report path. This used to throw
		// a raw Error, and `definePolicies` runs at module-body evaluation time, so
		// one typo in one plugin took the whole application down at boot.
		if (!policy || typeof policy !== 'object' || !policy.name || !policy.resource || !policy.operation) {
			const name = String((policy as PolicyDefinition | undefined)?.name ?? '')
			const resource = String((policy as PolicyDefinition | undefined)?.resource ?? '')
			const operation = String((policy as PolicyDefinition | undefined)?.operation ?? '')
			recordDiscardedPolicy({
				name,
				resource,
				operation,
				// `?` rather than an empty segment, so the key reads as a shape with a
				// hole in it instead of as a grant on the empty resource.
				key: `${resource ? normalizeKey(resource) : '?'}:${operation ? normalizeKey(operation) : '?'}`,
				reason: 'incomplete',
				declaredIn: callerFilePath ?? undefined
			})
			continue
		}

		const resourceKey = normalizeKey(policy.resource)
		const operationKey = normalizeKey(policy.operation)

		if (!(CLOSED_OPERATIONS as readonly string[]).includes(operationKey)) {
			// Discarded whole, resource included: registering the resource off a
			// policy nobody can hold would enrol its entity in field filtering with
			// no readable grant behind it.
			recordDiscardedPolicy({
				name: policy.name,
				resource: policy.resource,
				operation: policy.operation,
				key: `${resourceKey}:${operationKey}`,
				reason: 'operation',
				declaredIn: callerFilePath ?? undefined
			})
			continue
		}

		policy.resource = resourceKey
		policy.operation = operationKey

		PolicyResource[resourceKey] = policy.resource
		PolicyOperation[operationKey] = policy.operation
		Policy[policy.name] = { ...policy }
		accepted.push(policy)
	}

	return {
		[AccessPolicySymbol]: true,
		policies: accepted
	}
}

export { Policy, PolicyOperation, PolicyResource }
