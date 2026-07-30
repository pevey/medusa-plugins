import { model } from '@medusajs/framework/utils'
import { ChatMessage } from './chat-message'

export const ChatSession = model
	.define('chatSession', {
		id: model.id().primaryKey(),
		user_id: model.text(), // admin actor_id (owner)
		title: model.text(), // auto from first user message
		last_message_at: model.dateTime(), // touched each turn; drives sidebar order + purge
		messages: model.hasMany(() => ChatMessage, { mappedBy: 'session' })
	})
	.cascades({ delete: ['messages'] })
