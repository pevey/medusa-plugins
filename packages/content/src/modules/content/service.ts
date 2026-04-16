import { MedusaService } from '@medusajs/framework/utils'
import { ContentCreator } from './models/content-creator'
import {
	ContentCreatorActivity,
	ContentCreatorActivityType
} from './models/content-creator-activity'
import { ContentField } from './models/content-field'
import { ContentItem, ContentStatus } from './models/content-item'
import { ContentItemActivity, ContentItemActivityType } from './models/content-item-activity'
import { ContentLink } from './models/content-link'
import { ContentRelationship } from './models/content-relationship'
import { ContentTag } from './models/content-tag'
import { ContentCollection } from './models/content-collection'

export class ContentService extends MedusaService({
	ContentCollection,
	ContentCreator,
	ContentCreatorActivity,
	ContentField,
	ContentItem,
	ContentItemActivity,
	ContentLink,
	ContentRelationship,
	ContentTag
}) {
	async updateItem(input: {
		id: string
		status?: ContentStatus
		published_at?: Date | null
		[key: string]: unknown
	}) {
		const normalized =
			input.status === ContentStatus.PUBLISHED && input.published_at === undefined
				? { ...input, published_at: new Date() }
				: input
		return this.updateContentItems(normalized)
	}

	async logContentItemActivity(
		contentItemId: string,
		userId: string,
		type: ContentItemActivityType,
		note?: string
	) {
		return this.createContentItemActivities({
			item_id: contentItemId,
			user_id: userId,
			type,
			note: note ?? null
		})
	}

	async logContentCreatorActivity(
		contentCreatorId: string,
		userId: string,
		type: ContentCreatorActivityType,
		note?: string
	) {
		return this.createContentCreatorActivities({
			creator_id: contentCreatorId,
			user_id: userId,
			type,
			note: note ?? null
		})
	}
}
