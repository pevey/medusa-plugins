import { z } from 'zod'

export const StoreSearchQuerySchema = z.object({
	// Bounded because the term drives word_similarity() across every indexed row — an unbounded
	// term is a cheap way to make each request expensive. Longer input is truncated, not rejected.
	q: z
		.string()
		.optional()
		.default('')
		.transform(v => v.slice(0, 100)),
	limit: z.preprocess(v => {
		if (typeof v === 'string' && v.length > 0) return parseInt(v, 10)
		return v
	}, z.number().int().positive().max(25).optional().default(12)),
	locale: z.string().optional()
})

export type StoreSearchQuery = z.infer<typeof StoreSearchQuerySchema>
