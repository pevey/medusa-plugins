import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetSerialNumberType, AdminUpdateSerialNumberType } from '../../../validators'
import { TRACING_MODULE } from '../../../../modules/tracing'
import { TracingService } from '../../../../modules/tracing/service'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetSerialNumberType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [serialNumber]
	} = await query.graph(
		{
			entity: 'serial_number',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ serial_number: serialNumber })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateSerialNumberType>, res: MedusaResponse) => {
	const { id } = req.params
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	const serialNumber = await tracingService.updateSerialNumbers({
		id,
		...req.validatedBody
	})
	// See the POST /admin/serial-numbers handler: updateSerialNumbers returns the raw ORM
	// entity (metadata/deleted_at included), so pick down to AdminSerialNumber's fields.
	const { id: serialNumberId, stock_lot_id, order_id, value, invalidated, created_at, updated_at } = serialNumber
	res.json({ serial_number: { id: serialNumberId, stock_lot_id, order_id, value, invalidated, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	await tracingService.deleteSerialNumbers([id])
	res.json({ deleted: [id] })
}
