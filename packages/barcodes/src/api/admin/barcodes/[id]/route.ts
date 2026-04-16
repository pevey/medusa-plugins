import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetBarcodeType, AdminUpdateBarcodeType } from '../../../validators'
import { BARCODE_MODULE } from '../../../../modules/barcode'
import { BarcodeService } from '../../../../modules/barcode/service'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetBarcodeType>,
	res: MedusaResponse
) => {
	const { id } = req.params
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [barcode]
	} = await query.graph({
		entity: 'barcode',
		fields: req.queryConfig.fields,
		filters: { id }
	})
	res.json({ barcode })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateBarcodeType>,
	res: MedusaResponse
) => {
	const { id } = req.params
	const barcodeService: BarcodeService = req.scope.resolve(BARCODE_MODULE)
	const barcode = await barcodeService.updateBarcodes({
		id,
		...req.validatedBody
	})
	res.json({ barcode })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const barcodeService: BarcodeService = req.scope.resolve(BARCODE_MODULE)
	await barcodeService.deleteBarcodes([id])
	const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
	await link.delete({
		[BARCODE_MODULE]: {
			barcode_id: id
		}
	})
	res.json({ deleted: id })
}
