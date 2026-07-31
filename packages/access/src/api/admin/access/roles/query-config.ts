export enum Entities {
	user = 'user',
	access_role = 'access_role'
}

// NOTE: no `parent_id` here -- `access_role` has no such scalar column (role
// hierarchy is the separate `access_role_parent` many-to-many join). See the
// note on `AdminAccessRole` in `src/admin/types.ts`.
export const defaultAdminAccessRoleFields = ['id', 'name', 'description', 'metadata', 'created_at', 'updated_at', 'deleted_at']

export const retrieveTransformQueryConfig = {
	defaults: defaultAdminAccessRoleFields,
	isList: false
}

export const listTransformQueryConfig = {
	...retrieveTransformQueryConfig,
	defaultLimit: 20,
	isList: true
}

// `policy.key` (not bare `policy`): the `policy` field on `access_role_policy`
// is a `belongsTo` relation to `access_policy`, so a bare `policy` selection
// returns the nested `{ id }` relation stub, not the permission-key string the
// admin type/UI expect (`AdminAccessRolePolicy.policy: string`, rendered
// directly as `{p.policy}` on the role detail page). The route flattens
// `policy.key` back onto a `policy` string field before responding -- see
// `roles/[id]/policies/route.ts`.
export const defaultAdminRolePoliciesFields = ['id', 'role_id', 'policy_id', 'policy.key', 'metadata', 'created_at', 'updated_at', 'deleted_at']

export const retrieveRolePoliciesTransformQueryConfig = {
	defaults: defaultAdminRolePoliciesFields,
	isList: false
}

export const listRolePoliciesTransformQueryConfig = {
	...retrieveRolePoliciesTransformQueryConfig,
	isList: true
}

// Explicit fields, not `user.*`: the wildcard pulls back the FULL raw `user`
// row (avatar_url, metadata, created_at, updated_at, deleted_at) through a
// permissions-management endpoint, none of which `AdminAccessRoleUser` or any
// admin component reads -- an unnecessary over-exposure of internal user data.
export const defaultAdminRoleUsersFields = ['user_id', 'access_role_id', 'user.id', 'user.email', 'user.first_name', 'user.last_name']

export const listRoleUsersTransformQueryConfig = {
	defaults: defaultAdminRoleUsersFields,
	isList: true
}
