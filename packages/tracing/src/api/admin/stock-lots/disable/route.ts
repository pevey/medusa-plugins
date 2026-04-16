import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AdminDeleteStockLotsType } from '../../../validators'
import { updateStockLotWorkflow } from '../../../../workflows/tracing/update-stock-lot'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminDeleteStockLotsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	await Promise.all(
		ids.map(id =>
			updateStockLotWorkflow(req.scope).run({
				input: {
					id,
					enabled: false
				}
			})
		)
	)
	res.json({ disabled: ids })
}
