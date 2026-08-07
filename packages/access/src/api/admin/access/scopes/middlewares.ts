import { AccessMiddlewareRoute, PolicyOperation } from '../../../../utils'

/**
 * Gated on role-read: the pickers that consume this live on the role screens,
 * and knowing which scopes exist is part of reading how roles can be shaped.
 */
export const adminAccessScopeRoutesMiddlewares: AccessMiddlewareRoute[] = [
	{
		method: ['GET'],
		matcher: '/admin/access/scopes',
		middlewares: [],
		accessPolicies: [
			{
				resource: 'access_role',
				operation: PolicyOperation.read
			}
		]
	},
	{
		method: ['GET'],
		matcher: '/admin/access/scopes/:type/options',
		middlewares: [],
		accessPolicies: [
			{
				resource: 'access_role',
				operation: PolicyOperation.read
			}
		]
	}
]
