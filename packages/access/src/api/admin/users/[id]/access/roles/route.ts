import { assignUserRolesWorkflow, removeUserRolesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const userId = req.params.id
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: assignments, metadata } = await query.graph({
		entity: 'access_role_assignment',
		fields: req.queryConfig?.fields,
		filters: { ...req.filterableFields, grantee_type: 'user', grantee_id: userId },
		pagination: req.queryConfig?.pagination || {}
	})

	const roles = assignments.map((assignment: any) => assignment.role)

	res.status(200).json({
		roles,
		count: metadata?.count ?? 0,
		offset: metadata?.skip ?? 0,
		limit: metadata?.take ?? 0
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<{ roles: string[] }>, res: MedusaResponse) => {
	const userId = req.params.id
	const { roles } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [user]
	} = await query.graph({
		entity: 'user',
		fields: ['id'],
		filters: { id: userId }
	})

	if (!user) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `User with id "${userId}" not found`)
	}

	await assignUserRolesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			user_id: userId,
			role_ids: roles
		}
	})

	const { data: assignments } = await query.graph({
		entity: 'access_role_assignment',
		fields: ['role.*'],
		filters: { grantee_type: 'user', grantee_id: userId }
	})

	const userRoles = assignments.map((assignment: any) => assignment.role)

	res.status(200).json({ roles: userRoles })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<{ roles: string[] }>, res: MedusaResponse) => {
	const userId = req.params.id
	const { roles } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [user]
	} = await query.graph({
		entity: 'user',
		fields: ['id'],
		filters: { id: userId }
	})

	if (!user) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `User with id "${userId}" not found`)
	}

	await removeUserRolesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			user_id: userId,
			role_ids: roles
		}
	})

	res.status(200).json({
		ids: roles,
		object: 'user_role',
		deleted: true
	})
}
