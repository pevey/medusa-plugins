import { WorkflowResponse, createWorkflow, transform, when } from '@medusajs/framework/workflows-sdk'
import { createRoleAssignmentsStep } from '../steps/create-role-assignments'
import { getUsersToBootstrapStep } from '../steps/get-users-to-bootstrap'

export const bootstrapSuperAdminWorkflowId = 'bootstrap-super-admin-access'

/**
 * Event emitted by the access module's `onApplicationStart` hook to trigger the
 * first-load super-admin bootstrap from a subscriber (which receives the full app
 * container, so the workflow's steps can resolve `query`/`link`).
 */
export const BOOTSTRAP_SUPER_ADMIN_EVENT = 'access.bootstrap-super-admin'

/**
 * First-load bootstrap: grants the seeded super-admin role to all existing users
 * when no role assignment exists yet — so installing the plugin (which gates
 * the whole admin) does not lock out the store operator. Idempotent: once any
 * assignment exists, it becomes a no-op.
 */
export const bootstrapSuperAdminWorkflow = createWorkflow(bootstrapSuperAdminWorkflowId, () => {
	const { userIds } = getUsersToBootstrapStep()

	when({ userIds }, ({ userIds }) => (userIds?.length ?? 0) > 0).then(() => {
		const assignments = transform({ userIds }, ({ userIds }) =>
			(userIds ?? []).map((userId: string) => ({
				role_id: 'acrl_super_admin',
				grantee_type: 'user',
				grantee_id: userId
			}))
		)
		createRoleAssignmentsStep({ assignments })
	})

	return new WorkflowResponse(void 0)
})
