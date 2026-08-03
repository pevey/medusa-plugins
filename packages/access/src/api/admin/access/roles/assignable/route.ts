import { getAssignableRolesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'

import { AdminGetAccessRolesParamsType } from '../validators'

/**
 * Returns the subset of `access_role`s the authenticated actor is allowed to
 * assign.
 *
 * @ignore
 */
export const GET = async (req: AuthenticatedMedusaRequest<undefined, AdminGetAccessRolesParamsType>, res: MedusaResponse) => {
	const { result } = await getAssignableRolesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			filters: req.filterableFields,
			pagination: req.queryConfig?.pagination
		}
	})

	res.status(200).json(result)
}
