import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { MILDRED_MODULE } from '../../../../modules/analytics'
import type { MildredService } from '../../../../modules/analytics/service'
import type { AdminGetFunnelQueryType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFunnelQueryType>,
	res: MedusaResponse
) => {
	const mildredService: MildredService = req.scope.resolve(MILDRED_MODULE)
	const validated = req.validatedQuery as AdminGetFunnelQueryType

	let funnel
	if (validated.funnel_id) {
		funnel = await mildredService.retrieveAnalyticsFunnel(validated.funnel_id)
	} else {
		const [defaultFunnel] = await mildredService.listAnalyticsFunnels({ is_default: true })
		funnel = defaultFunnel
	}

	if (!funnel) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, 'No funnel found. Create a funnel and set it as default.')
	}

	const steps = funnel.steps as string[]
	const results = await mildredService.getFunnel({
		steps,
		start_date: new Date(validated.start_date),
		end_date: new Date(validated.end_date),
		sales_channel_id: validated.sales_channel_id ?? (funnel.sales_channel_id as string | undefined)
	})

	res.json({ funnel: { id: funnel.id, name: funnel.name, label: funnel.label }, results })
}
