import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { assignRolesWorkflow, unassignRolesWorkflow } from 'medusa-plugin-access/workflows'
import { AdminCreateRoleAssignmentsType, AdminRemoveRoleAssignmentsType } from '../../validators'

const ASSIGNMENT_FIELDS = ['id', 'role_id', 'grantee_type', 'grantee_id', 'scope_type', 'scope_id']

/**
 * @ignore
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const roleId = req.params.id
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: assignments, metadata } = await query.graph({
		entity: 'access_role_assignment',
		fields: ASSIGNMENT_FIELDS,
		filters: { ...req.filterableFields, role_id: roleId },
		pagination: req.queryConfig?.pagination || {}
	})

	res.status(200).json({
		assignments,
		count: metadata?.count ?? 0,
		offset: metadata?.skip ?? 0,
		limit: metadata?.take ?? 0
	})
}

/**
 * @ignore
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateRoleAssignmentsType>, res: MedusaResponse) => {
	const roleId = req.params.id
	const { assignments } = req.validatedBody
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

	await assignRolesWorkflow(req.scope).run({
		input: {
			granting_actor_id: req.auth_context.actor_id,
			granting_actor_type: req.auth_context.actor_type,
			assignments: assignments.map(assignment => ({ ...assignment, role_id: roleId }))
		}
	})

	const { data: roleAssignments } = await query.graph({
		entity: 'access_role_assignment',
		fields: ASSIGNMENT_FIELDS,
		filters: { role_id: roleId }
	})

	res.status(200).json({ assignments: roleAssignments })
}

/**
 * @ignore
 */
export const DELETE = async (req: AuthenticatedMedusaRequest<AdminRemoveRoleAssignmentsType>, res: MedusaResponse) => {
	const roleId = req.params.id
	const { assignment_ids } = req.validatedBody
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	// The rows must belong to the role in the path — an id smuggled in from
	// another role would otherwise be removable under this route's policy.
	const { data: rows } = await query.graph({
		entity: 'access_role_assignment',
		fields: ['id', 'role_id'],
		filters: { id: assignment_ids }
	})

	const foreign = rows.filter((row: any) => row.role_id !== roleId)
	if (rows.length !== assignment_ids.length || foreign.length) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `One or more role assignments were not found on role "${roleId}"`)
	}

	await unassignRolesWorkflow(req.scope).run({
		input: {
			granting_actor_id: req.auth_context.actor_id,
			granting_actor_type: req.auth_context.actor_type,
			assignment_ids
		}
	})

	res.status(200).json({
		ids: assignment_ids,
		object: 'role_assignment',
		deleted: true
	})
}
