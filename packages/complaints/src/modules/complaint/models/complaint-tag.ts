import { model } from '@medusajs/framework/utils'
import { Complaint } from './complaint'

export const ComplaintTag = model.define('complaint_tag', {
	id: model.id().primaryKey(),
	value: model.text(),
	complaints: model.manyToMany(() => Complaint)
})
