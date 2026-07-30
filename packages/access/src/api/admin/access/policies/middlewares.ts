import * as QueryConfig from './query-config'

import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/framework/http'
import { PolicyOperation } from '../../../../utils'

import {
	AdminCreateAccessPolicy,
	AdminGetAccessPoliciesParams,
	AdminGetAccessPolicyParams,
	AdminGetAccessPolicyRolesParams,
	AdminUpdateAccessPolicy
} from './validators'

const RBAC_POLICY_RESOURCE = 'access_policy'
const RBAC_ROLE_RESOURCE = 'access_role'

export const adminAccessPolicyRoutesMiddlewares: MiddlewareRoute[] = [
	{
		method: ['GET'],
		matcher: '/admin/access/policies',
		middlewares: [validateAndTransformQuery(AdminGetAccessPoliciesParams, QueryConfig.listTransformQueryConfig)],
		policies: [{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.read }]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/policies/assignable',
		middlewares: [validateAndTransformQuery(AdminGetAccessPoliciesParams, QueryConfig.listTransformQueryConfig)],
		policies: [{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.read }]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/policies/:id',
		middlewares: [validateAndTransformQuery(AdminGetAccessPolicyParams, QueryConfig.retrieveTransformQueryConfig)],
		policies: [{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.read }]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/policies/:id/roles',
		middlewares: [validateAndTransformQuery(AdminGetAccessPolicyRolesParams, QueryConfig.listAccessPolicyRolesTransformQueryConfig)],
		policies: [
			{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.read },
			{ resource: RBAC_ROLE_RESOURCE, operation: PolicyOperation.read }
		]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/policies',
		middlewares: [
			validateAndTransformBody(AdminCreateAccessPolicy),
			validateAndTransformQuery(AdminGetAccessPolicyParams, QueryConfig.retrieveTransformQueryConfig)
		],
		policies: [{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.create }]
	},
	{
		method: ['POST'],
		matcher: '/admin/access/policies/:id',
		middlewares: [
			validateAndTransformBody(AdminUpdateAccessPolicy),
			validateAndTransformQuery(AdminGetAccessPolicyParams, QueryConfig.retrieveTransformQueryConfig)
		],
		policies: [{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.update }]
	},
	{
		method: ['DELETE'],
		matcher: '/admin/access/policies/:id',
		middlewares: [],
		policies: [{ resource: RBAC_POLICY_RESOURCE, operation: PolicyOperation.delete }]
	}
]
