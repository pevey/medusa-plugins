import { WorkflowData, WorkflowResponse, createWorkflow, transform, when } from '@medusajs/framework/workflows-sdk'
import { updateAccessRolePoliciesStep, validateRolePolicyExistsStep, validateRolePolicyScopesStep } from '../steps'
import { validateUserPermissionsStep } from '../steps/validate-user-permissions'

/**
 * @ignore
 */
export type UpdateAccessRolePoliciesWorkflowInput = {
	actor_id?: string
	actor?: string
	role_id: string
	policy_id: string
	/** `null` clears the scope, making the grant unrestricted. */
	scope: string | null
}

/**
 * @ignore
 */
export const updateAccessRolePoliciesWorkflowId = 'update-access-role-policies'

/**
 * Change an existing grant's scope in place.
 *
 * Guarded by the same two checks as assignment, because a re-scope IS an
 * assignment: without them an actor holding `customer:delete@company` could
 * widen their own role's grant to unrestricted by editing it.
 *
 * @ignore
 */
export const updateAccessRolePoliciesWorkflow = createWorkflow(
	updateAccessRolePoliciesWorkflowId,
	(input: WorkflowData<UpdateAccessRolePoliciesWorkflowInput>) => {
		// Data integrity: a wildcard scope name, or one with no `defineScope`
		// registration, is rejected regardless of who the actor is.
		const scopeCheckData = transform({ input }, ({ input }) => ({
			policies: [{ policy_id: input.policy_id, scope: input.scope ?? undefined }]
		}))

		validateRolePolicyScopesStep(scopeCheckData)

		// Existence: an update whose selector matches nothing writes no rows and
		// would otherwise answer 200, reporting a tightening that never happened.
		const existsCheckData = transform({ input }, ({ input }) => ({
			role_id: input.role_id,
			policy_id: input.policy_id
		}))

		validateRolePolicyExistsStep(existsCheckData)

		// Assignability: you may only grant what you hold. Unrestricted covers any
		// scope; otherwise the scope names must match exactly.
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

		when({ validationData }, ({ validationData }) => !!validationData?.actor_id).then(() => {
			validateUserPermissionsStep(validationData)
		})

		const updateData = transform({ input }, ({ input }) => ({
			selector: { role_id: input.role_id, policy_id: input.policy_id },
			update: { scope: input.scope }
		}))

		return new WorkflowResponse(updateAccessRolePoliciesStep(updateData))
	}
)
