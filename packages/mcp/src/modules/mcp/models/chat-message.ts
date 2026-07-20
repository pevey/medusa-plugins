import { model } from '@medusajs/framework/utils'
import { ChatSession } from './chat-session'

export const ChatMessage = model.define('chatMessage', {
	id: model.id().primaryKey(),
	role: model.enum(['user', 'assistant']),
	content: model.json(), // ContentBlock[] (text | tool_use | tool_result)
	session: model.belongsTo(() => ChatSession, { mappedBy: 'messages' }),
})
