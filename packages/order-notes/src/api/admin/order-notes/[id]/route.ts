import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ORDER_NOTE_MODULE } from '../../../../modules/order-note'
import { OrderNoteService } from '../../../../modules/order-note/service'

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const orderNoteService: OrderNoteService = req.scope.resolve(ORDER_NOTE_MODULE)
	await orderNoteService.deleteOrderNotes([id])
	res.json({ deleted: [id] })
}
