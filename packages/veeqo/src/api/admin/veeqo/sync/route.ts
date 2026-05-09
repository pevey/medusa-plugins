import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import {
	syncOrderToVeeqoWorkflow,
	syncReplacementToVeeqoWorkflow
} from '../../../../workflows/order'
import { SourceType } from '../../../../modules/veeqo/models/veeqo-order'

type Body = {
	source_type?: SourceType
	source_id?: string
	order_id?: string
}

// Per-source manual retry. Useful when a specific claim/exchange sync failed and
// the operator wants to retry it after fixing the underlying issue.
//
// For source_type=ORDER_PLACED, source_id IS the order id (no separate order_id needed).
// For source_type=CLAIM or EXCHANGE, both order_id (the parent order) and source_id
// (the claim/exchange id) are required.
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const body = (req.body ?? {}) as Body

	if (!body.source_type || !body.source_id) {
		return res.status(400).json({ message: 'source_type and source_id are required' })
	}

	if (body.source_type === SourceType.ORDER_PLACED) {
		await syncOrderToVeeqoWorkflow(req.scope).run({ input: body.source_id })
		return res.json({ ok: true })
	}

	if (body.source_type !== SourceType.CLAIM && body.source_type !== SourceType.EXCHANGE) {
		return res.status(400).json({ message: `Unknown source_type: ${body.source_type}` })
	}

	if (!body.order_id) {
		return res
			.status(400)
			.json({ message: 'order_id is required when source_type is claim or exchange' })
	}

	await syncReplacementToVeeqoWorkflow(req.scope).run({
		input: {
			orderId: body.order_id,
			sourceType: body.source_type,
			sourceId: body.source_id
		}
	})

	res.json({ ok: true })
}
