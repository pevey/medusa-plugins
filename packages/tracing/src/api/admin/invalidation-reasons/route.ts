import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminCreateInvalidationReasonType, AdminDeleteInvalidationReasonsType, AdminGetInvalidationReasonsType } from '../../validators'
import { TRACING_MODULE } from '../../../modules/tracing'
import { TracingService } from '../../../modules/tracing/service'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetInvalidationReasonsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { q } = req.validatedQuery as {
		q?: string
	}

	const { data: invalidationReasons, metadata } = await query.graph({
		entity: 'invalidation_reason',
		...req.queryConfig,
		filters: {
			...(q ? { value: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		invalidation_reasons: invalidationReasons,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateInvalidationReasonType>, res: MedusaResponse) => {
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	const invalidationReason = await tracingService.createInvalidationReasons(req.validatedBody)
	// createInvalidationReasons returns the raw ORM entity (metadata/deleted_at included),
	// which isn't part of the admin contract (no GET route ever selects them). Pick down to
	// AdminInvalidationReason's fields so the create response matches the GET shape.
	const { id, value, created_at, updated_at } = invalidationReason
	res.json({ invalidation_reason: { id, value, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteInvalidationReasonsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	await tracingService.deleteInvalidationReasons(ids)
	res.json({ deleted: ids })
}
