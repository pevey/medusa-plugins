export const defaultAdminUserRolesFields = ['role_id', 'grantee_id', 'role.*']

export const listUserRolesTransformQueryConfig = {
	defaults: defaultAdminUserRolesFields,
	isList: true,
	entity: 'access_role_assignment'
}
