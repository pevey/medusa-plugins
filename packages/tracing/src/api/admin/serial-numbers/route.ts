import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetSerialNumbersType, AdminCreateSerialNumberType, AdminDeleteSerialNumbersType } from '../../validators'
import { TRACING_MODULE } from '../../../modules/tracing'
import { TracingService } from '../../../modules/tracing/service'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetSerialNumbersType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { stock_lot_id, order_id, invalidated, q } = req.validatedQuery

	const { data: serialNumbers, metadata } = await query.graph({
		entity: 'serial_number',
		...req.queryConfig,
		filters: {
			...(stock_lot_id ? { stock_lot_id } : {}),
			...(order_id ? { order_id } : {}),
			...(invalidated != null ? { invalidated } : {}),
			...(q ? { value: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		serial_numbers: serialNumbers,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateSerialNumberType>, res: MedusaResponse) => {
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	const serialNumber = await tracingService.createSerialNumbers(req.validatedBody)
	// createSerialNumbers returns the raw ORM entity (metadata/deleted_at included), which
	// isn't part of the admin contract (no GET route ever selects them). Pick down to
	// AdminSerialNumber's fields so the create response matches the GET shape.
	const { id, stock_lot_id, order_id, value, invalidated, created_at, updated_at } = serialNumber
	res.json({ serial_number: { id, stock_lot_id, order_id, value, invalidated, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteSerialNumbersType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	await tracingService.deleteSerialNumbers(ids)
	res.json({ deleted: ids })
}
