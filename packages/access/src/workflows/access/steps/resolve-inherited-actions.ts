import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ACCESS_MODULE } from '../../../modules/access'
import { AccessModuleService } from '../../../modules/access/service'

/**
 * @ignore
 * @featureFlag access
 */
export type ResolveInheritedActionsStepInput = {
	role_ids: string[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const resolveInheritedActionsStepId = 'resolve-inherited-actions'

/**
 * Resolves the full effective policy set (own + inherited) of a set of roles,
 * deduplicated to `{ resource, operation, scope }`. Used to authorize attaching
 * a role as a PARENT: the actor must hold everything that parent's chain would
 * confer, or attaching it is a privilege escalation -- the parent's own
 * ancestors are already included, because `listPoliciesForRole` walks the same
 * recursive CTE upward from that role.
 * @ignore
 * @featureFlag access
 */
export const resolveInheritedActionsStep = createStep(resolveInheritedActionsStepId, async (data: ResolveInheritedActionsStepInput, { container }) => {
	const roleIds = Array.from(new Set(data.role_ids)).filter(Boolean)

	if (!roleIds.length) {
		return new StepResponse([])
	}

	const accessService: AccessModuleService = container.resolve(ACCESS_MODULE)

	const policiesByRole = await Promise.all(roleIds.map(roleId => accessService.listPoliciesForRole(roleId)))

	const seen = new Set<string>()
	const actions: { resource: string; operation: string; scope?: string }[] = []

	for (const policies of policiesByRole) {
		for (const policy of policies) {
			const key = `${policy.resource}:${policy.operation}:${policy.scope ?? ''}`
			if (seen.has(key)) {
				continue
			}
			seen.add(key)
			actions.push({ resource: policy.resource, operation: policy.operation, scope: policy.scope ?? undefined })
		}
	}

	return new StepResponse(actions)
})
