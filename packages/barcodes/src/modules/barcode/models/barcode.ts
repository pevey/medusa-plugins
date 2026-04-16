import { model } from '@medusajs/framework/utils'

// store one barcode per inventory item, which can be used for scanning items during fulfillment or receiving
// learn how to use the file service to attach images of the barcode for scanning in the future

export const Barcode = model.define('barcode', {
	id: model.id().primaryKey(),
	url: model.text(),
	metadata: model.json().nullable()
})
