import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import { IAccessModuleService } from '../modules/access/types'

/**
 * Transfers an invite's role assignments to the user its acceptance created.
 *
 * Core's `acceptInviteWorkflow` is not ours to edit, so the transfer rides its
 * `invite.accepted` event. Verified constraints of that flow: the payload
 * carries only the invite id, the invite is (soft-)deleted in parallel with
 * the emit, and the created user's email is `input.user.email ?? invite.email`.
 * Hence: fetch the invite withDeleted for its email, find the user by that
 * email, copy the invite's assignments preserving scope columns, delete the
 * invite's own.
 *
 * Idempotent under redelivery — the copy skips rows that already exist (the
 * table's uniqueness makes the check cheap), and a re-run after the delete
 * finds nothing to transfer.
 *
 * Documented edge, accepted: if the accepting user supplied a DIFFERENT email
 * than the invite's, the lookup misses. The subscriber then warns naming the
 * invite id and leaves its assignments in place for manual transfer —
 * fail-safe, never a guess. (The core dashboard's accept flow never overrides
 * the email.)
 */
export default async function inviteAcceptedHandler({ event, container }: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger')

	try {
		const inviteId = event.data.id
		const accessService = container.resolve<IAccessModuleService>('access')

		const inviteAssignments = await accessService.listAccessRoleAssignments({ grantee_type: 'invite', grantee_id: inviteId })
		if (!inviteAssignments.length) {
			return
		}

		const userService: any = container.resolve(Modules.USER)
		const [invite] = await userService.listInvites({ id: [inviteId] }, { withDeleted: true })
		if (!invite?.email) {
			logger.warn(`[access] invite.accepted for "${inviteId}": invite not found — its ${inviteAssignments.length} role assignment(s) were left in place`)
			return
		}

		const [user] = await userService.listUsers({ email: invite.email })
		if (!user) {
			logger.warn(
				`[access] invite.accepted for "${inviteId}": no user with the invite's email — the acceptance may have supplied a different one. Its ${inviteAssignments.length} role assignment(s) were left in place for manual transfer.`
			)
			return
		}

		const existing = await accessService.listAccessRoleAssignments({ grantee_type: 'user', grantee_id: user.id })
		const key = (row: { role_id: string; scope_type?: string | null; scope_id?: string | null }) =>
			`${row.role_id} ${row.scope_type ?? ''} ${row.scope_id ?? ''}`
		const held = new Set(existing.map(key))

		const toCreate = inviteAssignments
			.filter(assignment => !held.has(key(assignment)))
			.map(assignment => ({
				role_id: assignment.role_id,
				grantee_type: 'user',
				grantee_id: user.id,
				scope_type: assignment.scope_type ?? null,
				scope_id: assignment.scope_id ?? null
			}))

		if (toCreate.length) {
			await accessService.createAccessRoleAssignments(toCreate)
		}
		await accessService.deleteAccessRoleAssignments(inviteAssignments.map(assignment => assignment.id))

		logger.info(`[access] transferred ${inviteAssignments.length} role assignment(s) from invite "${inviteId}" to user "${user.id}"`)
	} catch (error) {
		logger.error(`[access] invite.accepted role-assignment transfer failed: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: ['invite.accepted']
}
