import { z } from '@medusajs/framework/zod'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { VEEQO_MODULE } from '../../../../../../modules/veeqo'
import { VeeqoService } from '../../../../../../modules/veeqo/service'

const ShipmentIdParam = z.coerce.number().int().positive()

// passthrough route for retreiving tracking events for a shipment from veeqo
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const veeqoService: VeeqoService = req.scope.resolve(VEEQO_MODULE)
	const parseResult = ShipmentIdParam.safeParse(req.params.id)
	if (!parseResult.success) {
		res.status(400).json({ error: 'Invalid shipment ID.' })
		return
	}
	const id = parseResult.data
	const trackingEvents = await veeqoService.fetchTrackingEvents(id)
	res.json({ tracking_events: trackingEvents })
}
