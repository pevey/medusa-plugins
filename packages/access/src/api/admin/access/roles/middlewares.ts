import * as QueryConfig from './query-config'

import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/framework/http'
import { PolicyOperation } from '../../../../utils'

import { Entities } from './query-config'
import {
	AdminAddRolePoliciesType,
	AdminAssignRoleUsers,
	AdminCreateAccessRole,
	AdminGetAccessRoleParams,
	AdminGetAccessRolesParams,
	AdminGetRoleUsersParams,
	AdminRemoveRoleUsers,
	AdminUpdateAccessRole
} from './validators'

export const adminAccessRoleRoutesMiddlewares: MiddlewareRoute[] = [
	{
		method: ['GET'],
		matcher: '/admin/access/roles',
		middlewares: [validateAndTransformQuery(AdminGetAccessRolesParams, QueryConfig.listTransformQueryConfig)],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.read
			}
		]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/roles/assignable',
		middlewares: [validateAndTransformQuery(AdminGetAccessRolesParams, QueryConfig.listTransformQueryConfig)],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.read
			}
		]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/roles/:id',
		middlewares: [validateAndTransformQuery(AdminGetAccessRoleParams, QueryConfig.retrieveTransformQueryConfig)],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.read
			}
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/roles',
		middlewares: [
			validateAndTransformBody(AdminCreateAccessRole),
			validateAndTransformQuery(AdminGetAccessRoleParams, QueryConfig.retrieveTransformQueryConfig)
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/roles/:id',
		middlewares: [
			validateAndTransformBody(AdminUpdateAccessRole),
			validateAndTransformQuery(AdminGetAccessRoleParams, QueryConfig.retrieveTransformQueryConfig)
		],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/roles/:id/policies',
		middlewares: [validateAndTransformQuery(AdminGetAccessRoleParams, QueryConfig.retrieveRolePoliciesTransformQueryConfig)],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.read
			}
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/roles/:id/policies',
		middlewares: [
			validateAndTransformBody(AdminAddRolePoliciesType),
			validateAndTransformQuery(AdminGetAccessRoleParams, QueryConfig.retrieveRolePoliciesTransformQueryConfig)
		],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/access/roles/:id/policies/:policy_id',
		middlewares: [],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/roles/:id/users',
		middlewares: [validateAndTransformQuery(AdminGetRoleUsersParams, QueryConfig.listRoleUsersTransformQueryConfig)],
		policies: [
			{
				resource: Entities.user,
				operation: PolicyOperation.read
			}
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/roles/:id/users',
		middlewares: [validateAndTransformBody(AdminAssignRoleUsers)],
		policies: [
			{
				resource: Entities.user,
				operation: PolicyOperation.update
			},
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/access/roles/:id/users',
		middlewares: [validateAndTransformBody(AdminRemoveRoleUsers)],
		policies: [
			{
				resource: Entities.user,
				operation: PolicyOperation.update
			},
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/access/roles/:id',
		middlewares: [],
		policies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.delete
			}
		]
	}
]
