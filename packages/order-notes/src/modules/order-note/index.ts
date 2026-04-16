import { Module } from '@medusajs/framework/utils'
import { OrderNoteService } from './service'

export const ORDER_NOTE_MODULE = 'order_note'

export default Module(ORDER_NOTE_MODULE, {
	service: OrderNoteService
})

export * from './service'
