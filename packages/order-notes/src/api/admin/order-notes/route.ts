import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetOrderNotesType, AdminCreateOrderNoteType } from '../../validators'
import { ORDER_NOTE_MODULE } from '../../../modules/order-note'
import { OrderNoteService } from '../../../modules/order-note/service'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetOrderNotesType>,
	res: MedusaResponse
) => {
	const { order_id } = req.validatedQuery
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: order_notes, metadata } = await query.graph({
		entity: 'order_note',
		...req.queryConfig,
		filters: {
			...(order_id ? { order_id } : {})
		}
	})

	res.json({
		order_notes,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateOrderNoteType>,
	res: MedusaResponse
) => {
	const orderNoteService: OrderNoteService = req.scope.resolve(ORDER_NOTE_MODULE)
	const order_note = await orderNoteService.createNote({
		...req.validatedBody,
		user_id: req.auth_context.actor_id
	})
	res.status(201).json({ order_note })
}
