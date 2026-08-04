import { deleteAccessRolesWorkflow, updateAccessRolesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import { assertScope } from '../../../../../utils'
import { AdminUpdateAccessRoleType } from '../validators'

/**
 * @ignore
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: roles } = await query.graph({
		entity: 'access_role',
		filters: { id: req.params.id },
		fields: req.queryConfig.fields
	})

	const role = roles[0]

	if (!role) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Role with id: ${req.params.id} not found`)
	}

	res.status(200).json({ role })
}

/**
 * @ignore
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateAccessRoleType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	// The workflow below writes by selector through the module service, which the
	// interceptor cannot narrow — so the scope has to be proven here.
	//
	// Ahead of the existence check, not after it: for a scoped actor that check's
	// own query is already narrowed, so an out-of-scope row 404s there and this
	// never runs, leaving the write's only real guard unexercised. Ordered first,
	// `assertScope` is the thing that refuses. The existence check still earns its
	// place for an unscoped actor, where `assertScope` is a no-op.
	await assertScope(req, { resource: 'access_role', id: req.params.id })

	const { data: existing } = await query.graph({
		entity: 'access_role',
		filters: { id: req.params.id },
		fields: ['id']
	})

	if (!existing[0]) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Role with id "${req.params.id}" not found`)
	}

	const { result } = await updateAccessRolesWorkflow(req.scope).run({
		input: {
			actor_id: req.auth_context.actor_id,
			actor: req.auth_context.actor_type,
			selector: { id: req.params.id },
			update: req.validatedBody
		}
	})

	const { data: roles } = await query.graph({
		entity: 'access_role',
		filters: { id: result[0].id },
		fields: req.queryConfig.fields
	})

	const role = roles[0]

	res.status(200).json({ role })
}

/**
 * @ignore
 */
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const id = req.params.id

	await deleteAccessRolesWorkflow(req.scope).run({
		input: { ids: [id] }
	})

	res.status(200).json({
		id,
		object: 'access_role',
		deleted: true
	})
}
