export const defaultAdminUserRolesFields = ['user_id', 'access_role_id', 'access_role.*']

export const listUserRolesTransformQueryConfig = {
	defaults: defaultAdminUserRolesFields,
	isList: true,
	entity: 'access_role'
}
