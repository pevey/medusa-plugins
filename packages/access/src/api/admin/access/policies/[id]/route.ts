import { deleteAccessPoliciesWorkflow, updateAccessPoliciesWorkflow } from 'medusa-plugin-access/workflows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import { AdminUpdateAccessPolicyType } from '../validators'

/**
 * @ignore
 * @featureFlag rbac
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: policies } = await query.graph({
		entity: 'access_policy',
		filters: { id: req.params.id },
		fields: req.queryConfig.fields
	})

	const policy = policies[0]

	if (!policy) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Policy with id: ${req.params.id} not found`)
	}

	res.status(200).json({ policy })
}

/**
 * @ignore
 * @featureFlag rbac
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateAccessPolicyType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: existing } = await query.graph({
		entity: 'access_policy',
		filters: { id: req.params.id },
		fields: ['id']
	})

	const existingPolicy = existing[0]
	if (!existingPolicy) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Policy with id "${req.params.id}" not found`)
	}

	const { result } = await updateAccessPoliciesWorkflow(req.scope).run({
		input: {
			selector: { id: req.params.id },
			update: req.validatedBody
		}
	})

	const { data: policies } = await query.graph({
		entity: 'access_policy',
		filters: { id: result[0].id },
		fields: req.queryConfig.fields
	})

	const policy = policies[0]

	res.status(200).json({ policy })
}

/**
 * @ignore
 * @featureFlag rbac
 */
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const id = req.params.id

	await deleteAccessPoliciesWorkflow(req.scope).run({
		input: { ids: [id] }
	})

	res.status(200).json({
		id,
		object: 'access_policy',
		deleted: true
	})
}
