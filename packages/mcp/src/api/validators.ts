import { z } from '@medusajs/framework/zod'

export const AdminPostChat = z.object({
	messages: z.array(z.object({
		role: z.enum(['user', 'assistant']),
		content: z.string()
	})).min(1)
})
export type AdminPostChatType = z.infer<typeof AdminPostChat>
