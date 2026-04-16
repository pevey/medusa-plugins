import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AdminRenderBarcodeType } from '../../validators'
import { BARCODE_MODULE } from '../../../modules/barcode'
import { BarcodeService } from '../../../modules/barcode/service'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminRenderBarcodeType>,
	res: MedusaResponse
) => {
	let options = req.validatedQuery
	console.log(options)

	const barcodeService = req.scope.resolve(BARCODE_MODULE) as BarcodeService

	// for testing, override options
	let gtin = options.gtin || '00850023754028'
	let serial = options.serial || '20007'
	let text = '(01)' + gtin + '(21)' + serial

	const buffer = await barcodeService.render({
		bcid: options.bcid || 'gs1datamatrix', // Barcode type
		text: options.text || text, // Barcode value
		height: options.height ? parseInt(options.height as string) : 40, // Barcode height, in mm
		width: options.width ? parseInt(options.width as string) : 40, // Barcode width, in mm
		parsefnc: (options.parsefnc as boolean) || true
	} as any)

	res.setHeader('Content-Type', 'image/png')
	res.send(buffer)
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminRenderBarcodeType>,
	res: MedusaResponse
) => {
	let options = req.body
	console.log(options)

	const barcodeService = req.scope.resolve(BARCODE_MODULE) as BarcodeService

	// for testing, override options
	let gtin = options.gtin || '00850023754028'
	let serial = options.serial || '20007'
	let text = '(01)' + gtin + '(21)' + serial // (01)00850023754028(21)20007

	const buffer = await barcodeService.render({
		bcid: options.bcid || 'gs1datamatrix', // Barcode type
		text: options.text || text, // Barcode value
		height: options.height || 40, // Barcode height, in mm
		width: options.width || 40,
		parsefnc: options.parsefnc || true
	} as any)

	res.setHeader('Content-Type', 'image/png')
	res.send(buffer)
}
