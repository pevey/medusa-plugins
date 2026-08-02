import { createAccessRolePoliciesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminAddRolePoliciesType } from '../../validators'

// `policy` on `access_role_policy` is a `belongsTo` relation, so the query
// graph always returns it as a nested object (e.g. `{ id }`), never the flat
// permission-key string the admin type/UI expect (`AdminAccessRolePolicy.policy:
// string`, rendered directly as `{p.policy}` on the role detail page). A
// caller can override `fields=` with bare `policy` (as this plugin's own
// `useAccessRolePolicies` hook used to), which would silently reproduce the
// nested shape -- so `key` is force-included in the query regardless of what
// was requested, and the result is flattened back onto `policy` before
// responding, in both the list (GET) and attach (POST) handlers below.
const withPolicyKey = (fields: string[] | undefined): string[] => {
	return [...(fields ?? []).filter(f => f !== 'policy'), 'policy.key']
}
const flattenPolicy = (row: any) => ({ ...row, policy: row.policy?.key })

/**
 * @ignore
 * @featureFlag rbac
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const roleId = req.params.id
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: policies, metadata } = await query.graph({
		entity: 'access_role_policy',
		fields: withPolicyKey(req.queryConfig?.fields),
		filters: { ...req.filterableFields, role_id: roleId },
		pagination: req.queryConfig?.pagination || {}
	})

	res.status(200).json({
		policies: policies.map(flattenPolicy),
		count: metadata?.count ?? 0,
		offset: metadata?.skip ?? 0,
		limit: metadata?.take ?? 0
	})
}

/**
 * @ignore
 * @featureFlag rbac
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminAddRolePoliciesType>, res: MedusaResponse) => {
	const roleId = req.params.id
	const { policies } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const rolePolicies = policies.map(policy =>
		typeof policy === 'string' ? { role_id: roleId, policy_id: policy, scope: undefined } : { role_id: roleId, policy_id: policy.id, scope: policy.scope }
	)

	const { result } = await createAccessRolePoliciesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			policies: rolePolicies
		}
	})

	const { data } = await query.graph({
		entity: 'access_role_policy',
		fields: withPolicyKey(req.queryConfig?.fields),
		filters: { id: result.map(r => r.id) }
	})

	res.status(200).json({ policies: data.map(flattenPolicy) })
}
