import { MedusaService } from '@medusajs/framework/utils'
import { ChatSession } from './models/chat-session'
import { ChatMessage } from './models/chat-message'
import type { McpPluginOptions } from '../../types'

const DEFAULT_RETENTION_DAYS = 30
const DEFAULT_MAX_HISTORY_TURNS = 10

export class McpService extends MedusaService({ ChatSession, ChatMessage }) {
	protected readonly options_: McpPluginOptions

	constructor(_container: object, options: McpPluginOptions) {
		super(...arguments)
		this.options_ = {
			chatRetentionDays: DEFAULT_RETENTION_DAYS,
			maxHistoryTurns: DEFAULT_MAX_HISTORY_TURNS,
			...options
		}
	}

	getOptions(): McpPluginOptions {
		return this.options_
	}

	/** Hard-delete sessions (and, via cascade, their messages) idle since before `cutoff`. */
	async purgeSessionsOlderThan(cutoff: Date): Promise<number> {
		const stale = await this.listChatSessions({ last_message_at: { $lt: cutoff } }, { select: ['id'] })
		if (!stale.length) return 0
		const ids = stale.map((s: { id: string }) => s.id)
		await this.deleteChatSessions(ids) // cascade removes messages
		return ids.length
	}
}
