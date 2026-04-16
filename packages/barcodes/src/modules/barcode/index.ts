import { Module } from '@medusajs/framework/utils'
import { BarcodeService } from './service'

export const BARCODE_MODULE = 'barcode'

export default Module(BARCODE_MODULE, {
	service: BarcodeService
})

export * from './service'
