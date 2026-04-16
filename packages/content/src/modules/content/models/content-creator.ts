import { model } from '@medusajs/framework/utils'
import { ContentItem } from './content-item'
import { ContentCreatorActivity } from './content-creator-activity'

export const ContentCreator = model
	.define('content_creator', {
		id: model.id().primaryKey(),
		name: model.text(),
		bio: model.text().nullable(),
		avatar_url: model.text().nullable(),
		metadata: model.json().nullable(),
		items: model.hasMany(() => ContentItem, {
			mappedBy: 'creator'
		}),
		activity: model.hasMany(() => ContentCreatorActivity, {
			mappedBy: 'creator'
		})
	})
	.cascades({
		delete: ['activity']
	})
