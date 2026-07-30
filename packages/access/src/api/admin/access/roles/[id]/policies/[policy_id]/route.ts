import { deleteAccessRolePoliciesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'

/**
 * @ignore
 * @featureFlag rbac
 */
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { policy_id, id: role_id } = req.params

	// First, we need to find the role_policy_id that connects this role and policy
	const query = req.scope.resolve('query')
	const { data: rolePolicies } = await query.graph({
		entity: 'access_role_policy',
		fields: ['id'],
		filters: { role_id, policy_id }
	})

	const rolePolicyId = rolePolicies[0]?.id

	await deleteAccessRolePoliciesWorkflow(req.scope).run({
		input: {
			role_policy_ids: rolePolicyId ? [rolePolicyId] : []
		}
	})

	res.status(200).json({
		id: rolePolicyId,
		object: 'access_role_policy',
		deleted: true
	})
}
