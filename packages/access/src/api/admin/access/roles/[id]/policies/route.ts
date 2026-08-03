import { createAccessRolePoliciesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ACCESS_MODULE } from '../../../../../../modules/access'
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
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const roleId = req.params.id
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	// `direct_only` steers this handler; it is not a column on
	// `access_role_policy`, so leaving it in the spread sends it to the query
	// graph as a filter and 500s.
	const { direct_only: directOnly, ...filterableFields } = (req.filterableFields ?? {}) as Record<string, unknown> & { direct_only?: boolean }

	const { data: policies, metadata } = await query.graph({
		entity: 'access_role_policy',
		fields: withPolicyKey(req.queryConfig?.fields),
		filters: { ...filterableFields, role_id: roleId },
		pagination: req.queryConfig?.pagination || {}
	})

	// Inherited grants are returned alongside the direct ones rather than merged
	// into them: they are not `access_role_policy` rows of THIS role, so they
	// have no link id and cannot be detached here — folding them into `policies`
	// would hand the UI rows its delete action cannot act on, and would make
	// pagination span two differently-sized sets.
	const inherited = directOnly ? [] : await listInheritedPolicies(req, roleId)

	res.status(200).json({
		policies: policies.map(flattenPolicy),
		inherited,
		count: metadata?.count ?? 0,
		offset: metadata?.skip ?? 0,
		limit: metadata?.take ?? 0
	})
}

/**
 * Grants this role holds through its parents, each naming the role it comes
 * from. The recursive hierarchy walk already computes this — the endpoint used
 * to discard it, which left a role's detail view showing only its direct grants
 * while the guard enforced the full inherited set.
 */
async function listInheritedPolicies(req: AuthenticatedMedusaRequest, roleId: string) {
	const accessModule: any = req.scope.resolve(ACCESS_MODULE)
	const effective = await accessModule.listPoliciesForRole(roleId)

	return effective
		.filter((row: any) => !!row.inherited_from_role_id)
		.map((row: any) => ({
			policy_id: row.id,
			policy: row.key,
			resource: row.resource,
			operation: row.operation,
			scope: row.scope ?? null,
			inherited_from_role_id: row.inherited_from_role_id,
			inherited_from_role_name: row.inherited_from_role_name
		}))
}

/**
 * @ignore
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
