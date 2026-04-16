import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../modules/complaint'
import { ComplaintService } from '../../../../../modules/complaint/service'
import { AdminGetComplaintProductStatsType } from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetComplaintProductStatsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { id: product_id } = req.params
	console.log('Received request for complaint stats of product', product_id)

	const {
		data: [complaintProductStat]
	} = await query.graph({
		entity: 'complaint_product_stat',
		...req.queryConfig,
		filters: { product_id }
	})

	if (!complaintProductStat) {
		res.status(404).json({ error: 'Complaint stats not found for product' })
		return
	}

	res.json({ complaint_product_stat: complaintProductStat })
}
