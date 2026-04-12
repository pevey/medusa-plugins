import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MILDRED_MODULE } from '../../../../modules/analytics'
import type { MildredService } from '../../../../modules/analytics/service'
import type { AdminGetRubricsType, AdminCreateRubricType, AdminDeleteRubricsType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetRubricsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q, active } = req.validatedQuery

	const filters: Record<string, unknown> = {}
	if (active !== undefined) filters.active = active
	if (q) filters.name = { $ilike: `%${q}%` }

	const { data: rubrics, metadata } = await query.graph({
		entity: 'analytics_rubric',
		...req.queryConfig,
		filters
	})

	res.json({
		rubrics,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateRubricType>,
	res: MedusaResponse
) => {
	const mildredService: MildredService = req.scope.resolve(MILDRED_MODULE)
	const rubric = await mildredService.createAnalyticsRubrics(req.validatedBody)
	res.json({ rubric })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteRubricsType>,
	res: MedusaResponse
) => {
	const mildredService: MildredService = req.scope.resolve(MILDRED_MODULE)
	await mildredService.deleteAnalyticsRubrics(req.validatedBody.ids)
	res.json({ deleted: req.validatedBody.ids })
}
