import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/framework/http'
import { PolicyOperation } from 'medusa-plugin-access/utils'
import * as QueryConfig from './query-config'
import { AdminAssignUserRoles, AdminGetUserRolesParams, AdminRemoveUserRoles } from './validators'

export const adminUserAccessRoleRoutesMiddlewares: MiddlewareRoute[] = [
	{
		method: ['GET'],
		matcher: '/admin/users/:id/access/roles',
		middlewares: [validateAndTransformQuery(AdminGetUserRolesParams, QueryConfig.listUserRolesTransformQueryConfig)],
		policies: [
			{ resource: 'user', operation: PolicyOperation.read },
			{ resource: 'access_role', operation: PolicyOperation.read }
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/users/:id/access/roles',
		middlewares: [validateAndTransformBody(AdminAssignUserRoles)],
		policies: [
			{ resource: 'user', operation: PolicyOperation.update },
			{ resource: 'access_role', operation: PolicyOperation.update }
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/users/:id/access/roles/:role_id',
		policies: [
			{ resource: 'user', operation: PolicyOperation.update },
			{ resource: 'access_role', operation: PolicyOperation.update }
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/users/:id/access/roles',
		middlewares: [validateAndTransformBody(AdminRemoveUserRoles)],
		policies: [
			{ resource: 'user', operation: PolicyOperation.update },
			{ resource: 'access_role', operation: PolicyOperation.update }
		]
	}
]
