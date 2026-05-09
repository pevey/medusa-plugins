import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncReplacementToVeeqoWorkflow } from '../../../../../../../workflows/order'
import { SourceType } from '../../../../../../../modules/veeqo/models/veeqo-order'
import { VeeqoService } from '../../../../../../../modules/veeqo/service'

type VeeqoOrderRow = {
	id: string
	source_type: SourceType
	source_id: string
	veeqo_order_id: number | null
	last_sync_error: string | null
}

// Bulk retry for unhealthy replacement VeeqoOrders on a given Medusa order.
// "Unhealthy" = veeqo_order_id IS NULL OR last_sync_error IS NOT NULL.
// ORDER_PLACED rows are excluded — those go through /admin/veeqo/orders/[orderId]/sync.
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { orderId } = req.params
	const veeqoService: VeeqoService = req.scope.resolve('veeqo')

	const allRows = (await veeqoService.listVeeqoOrders({
		order_id: orderId
	})) as unknown as VeeqoOrderRow[]

	const unhealthy = allRows.filter(
		row =>
			row.source_type !== SourceType.ORDER_PLACED &&
			(row.veeqo_order_id == null || row.last_sync_error != null)
	)

	const results: {
		source_type: string
		source_id: string
		ok: boolean
		error?: string
	}[] = []

	for (const row of unhealthy) {
		try {
			await syncReplacementToVeeqoWorkflow(req.scope).run({
				input: {
					orderId,
					sourceType: row.source_type as SourceType,
					sourceId: row.source_id
				}
			})
			results.push({
				source_type: row.source_type,
				source_id: row.source_id,
				ok: true
			})
		} catch (err) {
			results.push({
				source_type: row.source_type,
				source_id: row.source_id,
				ok: false,
				error: err instanceof Error ? err.message : String(err)
			})
		}
	}

	res.json({ retried: results.length, results })
}
