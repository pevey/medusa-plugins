import { z } from '@medusajs/framework/zod'

export const AdminPostChat = z.object({
	session_id: z.string().optional(),
	text: z.string().min(1),
})
export type AdminPostChatType = z.infer<typeof AdminPostChat>
