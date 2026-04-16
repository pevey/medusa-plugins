import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { AdminSaveStatisticsLayoutType } from '../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const userId = req.auth_context.actor_id

	const { data: [user] } = await query.graph({
		entity: 'user',
		fields: ['id', 'metadata'],
		filters: { id: userId }
	})

	const layout = (user as any)?.metadata?.statistics_layout ?? null

	res.json({ layout })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSaveStatisticsLayoutType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const userService = req.scope.resolve(Modules.USER)
	const userId = req.auth_context.actor_id

	const { data: [user] } = await query.graph({
		entity: 'user',
		fields: ['id', 'metadata'],
		filters: { id: userId }
	})

	const existingMetadata = (user as any)?.metadata ?? {}

	await (userService as any).updateUsers({
		id: userId,
		metadata: {
			...existingMetadata,
			statistics_layout: req.validatedBody.layout
		}
	})

	res.json({ layout: req.validatedBody.layout })
}
