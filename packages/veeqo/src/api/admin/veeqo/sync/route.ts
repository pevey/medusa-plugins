import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncOrderToVeeqoWorkflow, syncReplacementToVeeqoWorkflow } from '../../../../workflows/order'
import { SourceType } from '../../../../modules/veeqo/models/veeqo-order'
import { AdminSyncSourceToVeeqoType } from '../../../validators'

// Per-source manual retry. Useful when a specific claim/exchange sync failed and
// the operator wants to retry it after fixing the underlying issue.
//
// For source_type=ORDER_PLACED, source_id IS the order id (no separate order_id needed).
// For source_type=CLAIM or EXCHANGE, both order_id (the parent order) and source_id
// (the claim/exchange id) are required.
export const POST = async (req: AuthenticatedMedusaRequest<AdminSyncSourceToVeeqoType>, res: MedusaResponse) => {
	const body = req.validatedBody

	if (body.source_type === SourceType.ORDER_PLACED) {
		await syncOrderToVeeqoWorkflow(req.scope).run({ input: body.source_id })
		return res.json({ ok: true })
	}

	await syncReplacementToVeeqoWorkflow(req.scope).run({
		input: {
			orderId: body.order_id!,
			sourceType: body.source_type,
			sourceId: body.source_id
		}
	})

	res.json({ ok: true })
}
