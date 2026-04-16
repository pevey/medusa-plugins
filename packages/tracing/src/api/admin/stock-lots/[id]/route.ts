import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetStockLotType, AdminUpdateStockLotType } from '../../../validators'
import { updateStockLotWorkflow } from '../../../../workflows/tracing/update-stock-lot'
import { deleteStockLotWorkflow } from '../../../../workflows/tracing/delete-stock-lot'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetStockLotType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [stockLot]
	} = await query.graph(
		{
			entity: 'stock_lot',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ stock_lot: stockLot })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateStockLotType>,
	res: MedusaResponse
) => {
	const { id } = req.params

	const { result } = await updateStockLotWorkflow(req.scope).run({
		input: {
			id,
			...req.validatedBody
		}
	})

	res.json({ stock_lot: result })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params

	const { result } = await deleteStockLotWorkflow(req.scope).run({
		input: {
			id
		}
	})

	res.json({ stock_lot: result })
}
