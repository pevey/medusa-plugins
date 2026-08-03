import * as QueryConfig from './query-config'

import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { AccessMiddlewareRoute, PolicyOperation } from '../../../../utils'

import { Entities } from './query-config'
import {
	AdminAddRolePoliciesType,
	AdminAssignRoleUsers,
	AdminCreateAccessRole,
	AdminGetAccessRoleParams,
	AdminGetAccessRolesParams,
	AdminGetRolePoliciesParams,
	AdminGetRoleUsersParams,
	AdminRemoveRoleUsers,
	AdminUpdateAccessRole,
	AdminUpdateRolePolicyScope
} from './validators'

export const adminAccessRoleRoutesMiddlewares: AccessMiddlewareRoute[] = [
	{
		method: ['GET'],
		matcher: '/admin/access/roles',
		middlewares: [validateAndTransformQuery(AdminGetAccessRolesParams, QueryConfig.listTransformQueryConfig)],
		accessPolicies: [
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
		accessPolicies: [
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
		accessPolicies: [
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
		],
		accessPolicies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.create
			}
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/roles/:id',
		middlewares: [
			validateAndTransformBody(AdminUpdateAccessRole),
			validateAndTransformQuery(AdminGetAccessRoleParams, QueryConfig.retrieveTransformQueryConfig)
		],
		// The handler looks the role up through the scoped query and then calls
		// `assertScope`, so a scoped `access_role:update` grant can be admitted
		// here rather than denied at the door as every unopted mutation is.
		assertsScope: true,
		accessPolicies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/roles/:id/policies',
		middlewares: [validateAndTransformQuery(AdminGetRolePoliciesParams, QueryConfig.retrieveRolePoliciesTransformQueryConfig)],
		accessPolicies: [
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
		accessPolicies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.update
			}
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/roles/:id/policies/:policy_id',
		middlewares: [validateAndTransformBody(AdminUpdateRolePolicyScope)],
		accessPolicies: [
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
		accessPolicies: [
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
		accessPolicies: [
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
		accessPolicies: [
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
		accessPolicies: [
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
		accessPolicies: [
			{
				resource: Entities.access_role,
				operation: PolicyOperation.delete
			}
		]
	}
]
