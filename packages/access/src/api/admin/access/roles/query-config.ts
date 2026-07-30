export enum Entities {
	user = 'user',
	access_role = 'access_role'
}

export const defaultAdminAccessRoleFields = ['id', 'name', 'parent_id', 'description', 'metadata', 'created_at', 'updated_at', 'deleted_at']

export const retrieveTransformQueryConfig = {
	defaults: defaultAdminAccessRoleFields,
	isList: false
}

export const listTransformQueryConfig = {
	...retrieveTransformQueryConfig,
	defaultLimit: 20,
	isList: true
}

export const defaultAdminRolePoliciesFields = ['id', 'role_id', 'policy_id', 'policy', 'metadata', 'created_at', 'updated_at', 'deleted_at']

export const retrieveRolePoliciesTransformQueryConfig = {
	defaults: defaultAdminRolePoliciesFields,
	isList: false
}

export const listRolePoliciesTransformQueryConfig = {
	...retrieveRolePoliciesTransformQueryConfig,
	isList: true
}

export const defaultAdminRoleUsersFields = ['user_id', 'access_role_id', 'user.*']

export const listRoleUsersTransformQueryConfig = {
	defaults: defaultAdminRoleUsersFields,
	isList: true
}
