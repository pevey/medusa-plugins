import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { VeeqoService } from '../../../../../modules/veeqo/service'
import { syncVeeqoOrderShipmentsWorkflow } from '../../../../../workflows/veeqo/shipments'

/**
 * POST /admin/veeqo/orders/shipment-sync
 *
 * Manually trigger shipment-status polling for all open VeeqoOrders.
 * Mirrors what the veeqo-order-sync scheduled job does — useful for testing
 * without waiting for the 15-minute cron.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const veeqoService: VeeqoService = req.scope.resolve('veeqo')

	const [orders] = await veeqoService.listAndCountVeeqoOrders({ status: 'open' }, { take: 500 })

	const results = await Promise.allSettled(
		(orders as any[]).map((order: any) =>
			syncVeeqoOrderShipmentsWorkflow(req.scope).run({
				input: { veeqoOrderDbId: order.id as string }
			})
		)
	)

	const succeeded = results.filter(r => r.status === 'fulfilled').length
	const failed = results.filter(r => r.status === 'rejected').length

	res.json({
		total: orders.length,
		succeeded,
		failed,
		errors: results
			.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
			.map(r => r.reason?.message ?? String(r.reason))
	})
}
