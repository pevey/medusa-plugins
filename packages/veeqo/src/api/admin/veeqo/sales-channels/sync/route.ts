import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncChannelToVeeqoWorkflow } from '../../../../../workflows/veeqo/channel'
import { AdminSyncSalesChannelsToVeeqoType } from '../../../../validators'

// one-way sync of sales channels from medusa to veeqo
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSyncSalesChannelsToVeeqoType>,
	res: MedusaResponse
) => {
	const { sales_channel_ids } = req.validatedBody
	const results = await Promise.all(
		sales_channel_ids.map(salesChannelId =>
			syncChannelToVeeqoWorkflow(req.scope).run({
				input: salesChannelId
			})
		)
	)
	res.json({ synced_sales_channel_ids: results.map(({ result }) => result?.id).filter(Boolean) })
}
