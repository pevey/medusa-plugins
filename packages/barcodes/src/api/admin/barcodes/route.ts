import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
	AdminCreateBarcodeType,
	AdminDeleteBarcodesType,
	AdminGetBarcodesType
} from '../../validators'
import { BARCODE_MODULE } from '../../../modules/barcode'
import { BarcodeService } from '../../../modules/barcode/service'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetBarcodesType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: barcodes, metadata } = await query.graph({
		entity: 'barcode',
		...req.queryConfig
	})
	res.json({
		barcodes,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateBarcodeType>,
	res: MedusaResponse
) => {
	const barcodeService: BarcodeService = req.scope.resolve(BARCODE_MODULE)
	const barcode = await barcodeService.createBarcodes(req.validatedBody)
	res.json({ barcode: barcode })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteBarcodesType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const barcodeService: BarcodeService = req.scope.resolve(BARCODE_MODULE)
	await barcodeService.deleteBarcodes(ids)
	const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
	await link.delete({
		[BARCODE_MODULE]: {
			barcode_id: ids
		}
	})
	res.json({ deleted: ids })
}
