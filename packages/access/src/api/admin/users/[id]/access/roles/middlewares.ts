import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { AccessMiddlewareRoute } from '../../../../../../utils'
import { PolicyOperation } from 'medusa-plugin-access/utils'
import * as QueryConfig from './query-config'
import { AdminAssignUserRoles, AdminGetUserRolesParams, AdminRemoveUserRoles } from './validators'

export const adminUserAccessRoleRoutesMiddlewares: AccessMiddlewareRoute[] = [
	{
		method: ['GET'],
		matcher: '/admin/users/:id/access/roles',
		middlewares: [validateAndTransformQuery(AdminGetUserRolesParams, QueryConfig.listUserRolesTransformQueryConfig)],
		accessPolicies: [
			{ resource: 'user', operation: PolicyOperation.read },
			{ resource: 'access_role', operation: PolicyOperation.read }
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/users/:id/access/roles',
		middlewares: [validateAndTransformBody(AdminAssignUserRoles)],
		accessPolicies: [
			{ resource: 'user', operation: PolicyOperation.update },
			{ resource: 'access_role', operation: PolicyOperation.update }
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/users/:id/access/roles/:role_id',
		accessPolicies: [
			{ resource: 'user', operation: PolicyOperation.update },
			{ resource: 'access_role', operation: PolicyOperation.update }
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/users/:id/access/roles',
		middlewares: [validateAndTransformBody(AdminRemoveUserRoles)],
		accessPolicies: [
			{ resource: 'user', operation: PolicyOperation.update },
			{ resource: 'access_role', operation: PolicyOperation.update }
		]
	}
]
