import { Module } from '@medusajs/framework/utils'
import restrictStoreFields from './loaders/restrict-store-fields'
import { OrderNoteService } from './service'

export const ORDER_NOTE_MODULE = 'order_note'

export default Module(ORDER_NOTE_MODULE, {
	service: OrderNoteService,
	loaders: [restrictStoreFields]
})

export * from './service'
export * from './types'
