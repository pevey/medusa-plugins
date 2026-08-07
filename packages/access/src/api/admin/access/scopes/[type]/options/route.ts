import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { getTenancy } from 'medusa-plugin-access/utils'

/**
 * The pickable tenant values for a tenancy dimension, from the dimension's
 * `options` config (`{ entity, display_field }`). Backs the assignment flow's
 * scope-value picker. 404 for an unknown dimension or one that declares no
 * options source — the picker simply has nothing to offer there.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const definition = getTenancy(req.params.type)

	if (!definition?.options) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `No option source is registered for tenancy "${req.params.type}"`)
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const displayField = definition.options.display_field

	const { data } = await query.graph({
		entity: definition.options.entity,
		fields: ['id', ...(displayField ? [displayField] : ['name'])]
	})

	const options = (data ?? [])
		.map((row: any) => ({
			id: row.id,
			label: (displayField ? row[displayField] : undefined) ?? row.name ?? row.title ?? row.id
		}))
		.filter((option: any) => option.id)

	res.status(200).json({ type: req.params.type, options })
}
