import { MedusaError } from '@medusajs/framework/utils'

/**
 * Produces a ROOT-LEVEL query filter narrowing a resource to the given tenant
 * ids. Constant per request — no actor involved: the ids come from the actor's
 * scoped role assignments, already resolved. Same root-level constraint as
 * `ScopeFilter` (the query layer prunes filters on expand nodes); nested
 * relation forms become legal once cross-module joins land upstream.
 */
export type TenancyFilter = (scopeIds: string[]) => Record<string, unknown>

/**
 * A tenancy dimension: a partitioning of resources by a tenant-shaped entity
 * (`sales_channel`, `company`). Registered once per `type`; the `resources`
 * map IS the coverage set — a grant on a resource outside it contributes
 * nothing from a scoped holding (fail closed, no per-dimension override).
 */
export type TenancyDefinition = {
	/** The dimension name, matching `access_role_assignment.scope_type`. */
	type: string
	/** Per covered resource: how to narrow it to a set of tenant ids. */
	resources: Record<string, TenancyFilter>
	/**
	 * B2 create rules: per covered resource, the request-body field that must
	 * fall inside the actor's tenant ids for `create` operations.
	 */
	create_fields?: Record<string, string>
	/**
	 * Backs the scope picker's value list (`GET /admin/access/scopes/:type/options`):
	 * which entity holds the tenant rows and which field labels them.
	 */
	options?: { entity: string; display_field?: string }
}

declare global {
	// eslint-disable-next-line no-var
	var AccessTenancies: Map<string, TenancyDefinition> | undefined
}

global.AccessTenancies ??= new Map()

/**
 * Registers a tenancy dimension. One registration per `type` — a duplicate
 * throws, same rule as `defineScope`: silent replacement of an enforcement
 * definition is a mistake, not an override mechanism.
 */
export function defineTenancy(input: TenancyDefinition): void {
	if (!input.resources || !Object.keys(input.resources).length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`defineTenancy: "${input.type}" declares no resources — the resources map is the coverage set, and an empty one can never narrow anything.`
		)
	}
	if (global.AccessTenancies!.has(input.type)) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `defineTenancy: "${input.type}" is already registered.`)
	}
	global.AccessTenancies!.set(input.type, input)
}

export function getTenancy(type: string): TenancyDefinition | undefined {
	return global.AccessTenancies!.get(type)
}

export function getTenancyFilter(type: string, resource: string): TenancyFilter | undefined {
	return global.AccessTenancies!.get(type)?.resources[resource]
}

export function hasTenancyResource(type: string, resource: string): boolean {
	return Boolean(global.AccessTenancies!.get(type)?.resources[resource])
}

/**
 * The registered tenancy dimensions with their coverage sets, sorted both ways
 * for stable output. Backs the scope-discovery endpoint alongside `listScopes`.
 */
export function listTenancies(): Array<{ type: string; resources: string[] }> {
	return [...(global.AccessTenancies ?? new Map()).entries()]
		.map(([type, definition]) => ({ type, resources: Object.keys(definition.resources).sort() }))
		.sort((a, b) => a.type.localeCompare(b.type))
}
