import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncChannelToVeeqoWorkflow } from '../../../../../../workflows/veeqo/channel'

// one-way sync of a sales channel from medusa to veeqo
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { salesChannelId } = req.params
	const { result } = await syncChannelToVeeqoWorkflow(req.scope).run({
		input: salesChannelId
	})
	if (result) {
		res.json({ veeqo_channel: result })
	} else {
		res.status(400).json({ error: 'Failed to sync channel' })
	}
}
