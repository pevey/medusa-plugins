import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { listScopes, listTenancies } from 'medusa-plugin-access/utils'
import { AdminAccessScopesResponse } from '../../../../admin/types'

/**
 * Scope discovery for the role-management UI: the registered actor-relative
 * scope names per resource (the `defineScope` registry) and the registered
 * tenancy dimensions with their coverage sets (the `defineTenancy` registry).
 * Offering only registered entries keeps the pickers from producing a grant
 * or assignment the guard would then deny as unenforceable.
 */
export const GET = async (_req: AuthenticatedMedusaRequest, res: MedusaResponse<AdminAccessScopesResponse>) => {
	res.status(200).json({ scopes: listScopes(), tenancies: listTenancies() })
}
