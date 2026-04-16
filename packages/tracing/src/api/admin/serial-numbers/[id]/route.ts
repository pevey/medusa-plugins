import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetSerialNumberType, AdminUpdateSerialNumberType } from '../../../validators'
import { TRACING_MODULE } from '../../../../modules/tracing'
import { TracingService } from '../../../../modules/tracing/service'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetSerialNumberType>,
	res: MedusaResponse
) => {
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

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateSerialNumberType>,
	res: MedusaResponse
) => {
	const { id } = req.params
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	const serialNumber = await tracingService.updateSerialNumbers({
		id,
		...req.validatedBody
	})
	res.json({ serial_number: serialNumber })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const tracingService: TracingService = req.scope.resolve(TRACING_MODULE)
	await tracingService.deleteSerialNumbers([id])
	res.json({ deleted: [id] })
}
