// Admin UI types for the access (roles/policies) dashboard pages. These mirror
// the response envelopes returned by the plugin's /admin/access/* routes.

export type AdminAccessRole = {
	id: string
	name: string
	parent_id?: string | null
	description?: string | null
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
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
	created_at: string
	updated_at: string
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
// points at the access_policy row.
export type AdminAccessRolePolicy = {
	id: string
	role_id: string
	policy_id: string
	policy: string
}

export type AdminAccessRolePoliciesResponse = {
	policies: AdminAccessRolePolicy[]
	count: number
	offset: number
	limit: number
}

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
