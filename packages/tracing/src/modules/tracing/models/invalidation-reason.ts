import { model } from '@medusajs/framework/utils'
import { SerialNumber } from './serial-number'

export const InvalidationReason = model.define('invalidation_reason', {
	id: model.id().primaryKey(),
	value: model.text(),
	serial_numbers: model.hasMany(() => SerialNumber, {
		mappedBy: 'invalidation_reason'
	}),
	metadata: model.json().nullable()
})
