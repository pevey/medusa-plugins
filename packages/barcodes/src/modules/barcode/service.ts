import { InferTypeOf } from '@medusajs/framework/types'
import { MedusaService } from '@medusajs/framework/utils'
import * as bwipjs from '@bwip-js/node'
import { Barcode } from './models/barcode'

export type Barcode = InferTypeOf<typeof Barcode>

export class BarcodeService extends MedusaService({
	Barcode
}) {
	async render(options: bwipjs.RenderOptions): Promise<Buffer> {
		// remove undefined options
		// @ts-ignore
		Object.keys(options).forEach(key => options[key] === undefined && delete options[key])
		return await bwipjs.toBuffer(options)
	}
}
