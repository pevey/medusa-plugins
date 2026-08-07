import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export interface GetInviteRolesStepInput {
	invite_id: string
}

/**
 * @ignore
 */
export const getInviteRolesStepId = 'get-invite-access-roles-step'
/**
 * This step retrieves the role assignments held by an invite — the rows the
 * accept-transfer flow copies to the created user, scope columns included.
 *
 * @example
 * const data = getInviteRolesStep({
 *   invite_id: "invite_123"
 * })
 * @ignore
 */
export const getInviteRolesStep = createStep(getInviteRolesStepId, async (input: GetInviteRolesStepInput, { container }) => {
	const service = container.resolve<IAccessModuleService>('access')

	const assignments = await service.listAccessRoleAssignments({
		grantee_type: 'invite',
		grantee_id: input.invite_id
	})

	return new StepResponse(assignments)
})
