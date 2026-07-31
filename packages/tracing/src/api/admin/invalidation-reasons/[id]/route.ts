import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetInvalidationReasonType, AdminUpdateInvalidationReasonType } from '../../../validators'
import { TRACING_MODULE } from '../../../../modules/tracing'
import { TracingService } from '../../../../modules/tracing/service'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetInvalidationReasonType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [invalidationReason]
	} = await query.graph(
		{
			entity: 'invalidation_reason',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ invalidation_reason: invalidationReason })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateInvalidationReasonType>, res: MedusaResponse) => {
	const { id } = req.params
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	const invalidationReason = await tracingService.updateInvalidationReasons({
		id,
		...req.validatedBody
	})
	// See the POST /admin/invalidation-reasons handler: updateInvalidationReasons returns the
	// raw ORM entity (metadata/deleted_at included), so pick down to AdminInvalidationReason's fields.
	const { id: reasonId, value, created_at, updated_at } = invalidationReason
	res.json({ invalidation_reason: { id: reasonId, value, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	await tracingService.deleteInvalidationReasons([id])
	res.json({ deleted: [id] })
}
