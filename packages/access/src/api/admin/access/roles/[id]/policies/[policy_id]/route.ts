import { deleteAccessRolePoliciesWorkflow, updateAccessRolePoliciesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminUpdateRolePolicyScopeType } from '../../../validators'

/**
 * Re-scope an existing grant in place.
 *
 * Before this, narrowing `customer:delete` to `customer:delete@company` meant
 * DELETE then re-POST — two writes, with the grant briefly absent in between.
 *
 * @ignore
 * @featureFlag rbac
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateRolePolicyScopeType>, res: MedusaResponse) => {
	const { policy_id, id: role_id } = req.params
	const { scope } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	await updateAccessRolePoliciesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			role_id,
			policy_id,
			scope
		}
	})

	const { data } = await query.graph({
		entity: 'access_role_policy',
		fields: ['id', 'role_id', 'policy_id', 'policy.key', 'scope'],
		filters: { role_id, policy_id }
	})

	res.status(200).json({ policy: data[0] ? { ...data[0], policy: data[0].policy?.key } : undefined })
}

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
