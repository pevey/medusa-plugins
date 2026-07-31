import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetOrderNotesType, AdminCreateOrderNoteType } from '../../validators'
import { ORDER_NOTE_MODULE } from '../../../modules/order-note'
import { OrderNoteService } from '../../../modules/order-note/service'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetOrderNotesType>, res: MedusaResponse) => {
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

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateOrderNoteType>, res: MedusaResponse) => {
	const orderNoteService: OrderNoteService = req.scope.resolve(ORDER_NOTE_MODULE)
	const { id, order_id, user_id, note, sent, metadata, created_at, updated_at } = await orderNoteService.createNote({
		...req.validatedBody,
		user_id: req.auth_context.actor_id
	})
	// Only the admin-facing fields are returned here -- the raw entity also carries
	// `deleted_at` (soft-delete bookkeeping), which GET /admin/order-notes deliberately
	// omits via its `defaults` list. Picking fields explicitly keeps this route's shape
	// consistent with the list/detail contract instead of leaking an internal column.
	res.status(201).json({ order_note: { id, order_id, user_id, note, sent, metadata, created_at, updated_at } })
}
