import { WorkflowData, WorkflowResponse, createWorkflow, transform, when } from '@medusajs/framework/workflows-sdk'
import { createAccessRolePoliciesStep, validateRolePolicyScopesStep } from '../steps'
import { validateUserPermissionsStep } from '../steps/validate-user-permissions'

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessRolePoliciesWorkflowInput = {
	actor_id?: string
	actor?: string
	policies: {
		role_id: string
		policy_id: string
		scope?: string
	}[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolePoliciesWorkflowId = 'create-access-role-policies'

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolePoliciesWorkflow = createWorkflow(
	createAccessRolePoliciesWorkflowId,
	(input: WorkflowData<CreateAccessRolePoliciesWorkflowInput>) => {
		// Data-integrity check (wildcard / unregistered scope / duplicate policy
		// id in one request): unconditional, independent of who the actor is --
		// see `validateRolePolicyScopesStep`. Deliberately NOT deduped here: a
		// repeated `policy_id` (same or different scope) is itself the error the
		// step reports, since the unique index is `(role_id, policy_id)` with no
		// `scope` column.
		const scopeCheckData = transform({ input }, ({ input }) => ({
			policies: input.policies.map(rp => ({ policy_id: rp.policy_id, scope: rp.scope }))
		}))

		validateRolePolicyScopesStep(scopeCheckData)

		const validationData = transform({ input, scopeCheckData }, ({ input, scopeCheckData }) => {
			if (!input.actor_id) {
				return null
			}

			return {
				actor_id: input.actor_id,
				actor: input.actor,
				policies: scopeCheckData.policies
			}
		})

		when({ validationData }, ({ validationData }) => {
			return !!validationData?.actor_id && !!validationData?.policies?.length
		}).then(() => {
			validateUserPermissionsStep(validationData)
		})

		const rolePolicies = createAccessRolePoliciesStep({
			policies: input.policies
		})

		return new WorkflowResponse(rolePolicies)
	}
)
