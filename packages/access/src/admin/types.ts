// Admin UI types for the access (roles/policies) dashboard pages. These mirror
// the response envelopes returned by the plugin's /admin/access/* routes.

// NOTE: `parent_id` is deliberately NOT modelled here. `access_role` has no such
// scalar column -- role hierarchy is a many-to-many `access_role_parent` join
// (role_id/parent_id pairs, plural `parent_ids` in the create/update workflow
// input), not a single FK. `defaultAdminAccessRoleFields` used to request a
// `parent_id` field that doesn't exist on the entity (silently dropped by the
// query graph -- confirmed empirically, not thrown); it has been removed from
// the query defaults. The `AdminCreateAccessRole`/`AdminUpdateAccessRole` body
// validators still accept a singular `parent_id`, which the workflow never
// reads (it reads `parent_ids`) -- that request-side dead field is a separate,
// pre-existing bug tracked outside this response-contracts pass (see
// task-4c-access-report.md).
export type AdminAccessRole = {
	id: string
	name: string
	description?: string | null
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
	deleted_at: string | null
}

export type AdminAccessRolesResponse = {
	roles: AdminAccessRole[]
	count: number
	offset: number
	limit: number
}

export type AdminAccessRoleResponse = { role: AdminAccessRole }

export type AdminAccessPolicy = {
	id: string
	key: string
	resource: string
	operation: string
	name?: string | null
	description?: string | null
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
	deleted_at: string | null
}

export type AdminAccessPoliciesResponse = {
	policies: AdminAccessPolicy[]
	count: number
	offset: number
	limit: number
}

export type AdminAccessPolicyResponse = { policy: AdminAccessPolicy }

// A row from GET /admin/access/roles/:id/policies (the access_role_policy join).
// `policy` is the permission key string (e.g. "product:read"); `policy_id`
// points at the access_policy row. `metadata`/`created_at`/`updated_at`/
// `deleted_at` are real columns on the join row -- present when the caller
// takes the query-config defaults, absent when a caller (e.g. this plugin's own
// `useAccessRolePolicies` hook) explicitly narrows `fields=` to the first four.
export type AdminAccessRolePolicy = {
	id: string
	role_id: string
	policy_id: string
	policy: string
	scope?: string | null
	metadata?: Record<string, unknown> | null
	created_at?: string
	updated_at?: string
	deleted_at?: string | null
}

// Grants this role holds through a parent role. Separate from `policies`
// because they are not this role's own link rows: they have no link id and
// cannot be detached here, only from the role named in `inherited_from_role_id`.
export type AdminInheritedRolePolicy = {
	policy_id: string
	policy: string
	resource: string
	operation: string
	scope: string | null
	inherited_from_role_id: string
	inherited_from_role_name: string | null
}

export type AdminAccessRolePoliciesResponse = {
	policies: AdminAccessRolePolicy[]
	inherited: AdminInheritedRolePolicy[]
	count: number
	offset: number
	limit: number
}

// POST /admin/access/roles/:id/policies — attach response. No pagination
// envelope (unlike the GET list above): the route returns exactly the rows it
// just created.
export type AdminAddRolePoliciesResponse = { policies: AdminAccessRolePolicy[] }

export type AdminAccessRoleUser = {
	id: string
	email: string
	first_name?: string | null
	last_name?: string | null
}

export type AdminAccessRoleUsersResponse = {
	users: AdminAccessRoleUser[]
	count: number
	offset: number
	limit: number
}

// POST /admin/access/roles/:id/users — assign response. No pagination
// envelope: the route returns the role's full current user set.
export type AdminAssignRoleUsersResponse = { users: AdminAccessRoleUser[] }

// GET /admin/access/policies/:id/roles — roles that include a given policy.
export type AdminAccessPolicyRole = AdminAccessRole & {
	users?: { id: string }[]
}

export type AdminAccessPolicyRolesResponse = {
	roles: AdminAccessPolicyRole[]
	count: number
	offset: number
	limit: number
}

// Core /admin/users list (for the "add users to role" picker + user widget).
export type AdminUserRow = {
	id: string
	email: string
	first_name?: string | null
	last_name?: string | null
}

export type AdminUsersResponse = {
	users: AdminUserRow[]
	count: number
	offset: number
	limit: number
}

// GET /admin/users/:id/access/roles — a user's assigned roles. Same envelope
// shape as `AdminAccessRolesResponse` (reused directly; see `useUserAccessRoles`).

// POST /admin/users/:id/access/roles — assign response. No pagination
// envelope: the route returns the user's full current role set.
export type AdminAssignUserRolesResponse = { roles: AdminAccessRole[] }

// GET /admin/access/me/permissions — the authenticated actor's effective,
// wildcard-expanded permission set as flat "resource:operation" strings.
// Consumed by OTHER plugins' admin widgets to detect whether access is
// installed and to read the caller's effective permissions, so `permissions`
// is a cross-plugin contract, not just an internal one -- it lists ONLY
// actions granted outright (unrestricted). `scoped` is additive: actions the
// actor can perform but only within a scope, which a consumer that can't
// apply a filter should treat as "not granted" the same way `hasPermission`
// now does.
export type AdminAccessMePermissionsResponse = {
	permissions: string[]
	scoped: { resource: string; operation: string; scope: string }[]
	/**
	 * Tenancy-scoped holdings, summarized per dimension: which tenants the
	 * actor is pinned to and through which roles. Additive — consumers of
	 * `permissions` are unaffected.
	 */
	tenancy?: { type: string; ids: string[]; roles: string[] }[]
}

// GET /admin/access/scopes — the registered scope names per resource, from the
// defineScope registry. Consumed by scope pickers in the role-management UI, so
// the options offered are exactly the scopes enforcement can actually apply.
export type AdminAccessScopesResponse = {
	scopes: { resource: string; names: string[] }[]
	/** Registered tenancy dimensions with their coverage sets. */
	tenancies: { type: string; resources: string[] }[]
}
