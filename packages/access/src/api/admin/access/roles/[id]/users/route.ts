import { assignUserRolesWorkflow, removeUserRolesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { AdminAssignRoleUsersType, AdminRemoveRoleUsersType } from '../../validators'

/**
 * @ignore
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const roleId = req.params.id
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	// Assignments carry no cross-module link to user, so membership resolves in
	// two steps: paginate the role's user assignments, then fetch those users.
	const { data: assignments, metadata } = await query.graph({
		entity: 'access_role_assignment',
		fields: ['grantee_id'],
		filters: { ...req.filterableFields, role_id: roleId, grantee_type: 'user' },
		pagination: req.queryConfig?.pagination || {}
	})

	const userIds = [...new Set((assignments ?? []).map((assignment: any) => assignment.grantee_id).filter(Boolean))]

	let users: any[] = []
	if (userIds.length) {
		const { data } = await query.graph({
			entity: 'user',
			fields: req.queryConfig?.fields,
			filters: { id: userIds }
		})
		const byId = new Map((data ?? []).map((user: any) => [user.id, user]))
		users = userIds.map(id => byId.get(id)).filter(Boolean)
	}

	res.status(200).json({
		users,
		count: metadata?.count ?? 0,
		offset: metadata?.skip ?? 0,
		limit: metadata?.take ?? 0
	})
}

/**
 * @ignore
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminAssignRoleUsersType>, res: MedusaResponse) => {
	const roleId = req.params.id
	const { users } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [role]
	} = await query.graph({
		entity: 'access_role',
		fields: ['id'],
		filters: { id: roleId }
	})

	if (!role) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Role with id "${roleId}" not found`)
	}

	await assignUserRolesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			role_id: roleId,
			user_ids: users
		}
	})

	const { data: assignments } = await query.graph({
		entity: 'access_role_assignment',
		fields: ['grantee_id'],
		filters: { role_id: roleId, grantee_type: 'user' }
	})

	const userIds = [...new Set((assignments ?? []).map((assignment: any) => assignment.grantee_id).filter(Boolean))]

	let roleUsers: any[] = []
	if (userIds.length) {
		const { data } = await query.graph({
			entity: 'user',
			fields: ['id', 'email', 'first_name', 'last_name'],
			filters: { id: userIds }
		})
		roleUsers = data ?? []
	}

	res.status(200).json({ users: roleUsers })
}

/**
 * @ignore
 */
export const DELETE = async (req: AuthenticatedMedusaRequest<AdminRemoveRoleUsersType>, res: MedusaResponse) => {
	const roleId = req.params.id
	const { users } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [role]
	} = await query.graph({
		entity: 'access_role',
		fields: ['id'],
		filters: { id: roleId }
	})

	if (!role) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Role with id "${roleId}" not found`)
	}

	await removeUserRolesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			role_id: roleId,
			user_ids: users
		}
	})

	res.status(200).json({
		ids: users,
		object: 'role_user',
		deleted: true
	})
}
