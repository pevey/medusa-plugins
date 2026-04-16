export type AdminOrderNote = {
	id: string
	order_id: string
	user_id: string
	note: string
	sent: boolean
	created_at: string
	updated_at: string
	metadata?: Record<string, unknown> | null
}

export type AdminOrderNotesResponse = {
	order_notes: AdminOrderNote[]
	count: number
	limit: number
	offset: number
}
