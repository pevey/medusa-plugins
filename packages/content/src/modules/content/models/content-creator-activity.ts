import { model } from '@medusajs/framework/utils'
import { ContentCreator } from './content-creator'

export enum ContentCreatorActivityType {
	EDIT = 'edit',
	NOTE = 'note'
}

export const ContentCreatorActivity = model.define('content_creator_activity', {
	id: model.id().primaryKey(),
	type: model.enum(ContentCreatorActivityType).default(ContentCreatorActivityType.NOTE),
	user_id: model.text(),
	note: model.text().nullable(),
	metadata: model.json().nullable(),
	creator: model.belongsTo(() => ContentCreator, {
		mappedBy: 'activity'
	})
})
