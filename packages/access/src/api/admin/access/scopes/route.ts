import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { listScopes } from 'medusa-plugin-access/utils'
import { AdminAccessScopesResponse } from '../../../../admin/types'

/**
 * Scope discovery for the role-management UI: the registered scope names per
 * resource, straight from the `defineScope` registry. Offering only registered
 * scopes keeps the picker from producing a grant the guard would then deny as
 * unenforceable.
 */
export const GET = async (_req: AuthenticatedMedusaRequest, res: MedusaResponse<AdminAccessScopesResponse>) => {
	res.status(200).json({ scopes: listScopes() })
}
