import { MedusaRequest } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import './access-context'

export async function assertScope(req: MedusaRequest, input: { resource: string; id: string | string[] }): Promise<void> {
	const enforcement = req.access_context?.enforcement
	if (!enforcement?.required.has(input.resource)) return

	const ids = [...new Set(Array.isArray(input.id) ? input.id : [input.id])]
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data } = await query.graph({ entity: input.resource, fields: ['id'], filters: { id: ids } })
	if (!enforcement.narrowed.has(input.resource)) {
		throw new MedusaError(
			MedusaError.Types.FORBIDDEN,
			`assertScope: the scope filter for "${input.resource}" was not applied — defineScope's resource must be the canonical entity name`
		)
	}
	if (data.length !== ids.length) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `${input.resource} with the given id was not found`)
	}
	enforcement.asserted.add(input.resource)
}
