import { z } from 'zod'

const addressSchema = z
	.object({
		first_name: z.string().nullable().optional(),
		last_name: z.string().nullable().optional(),
		company: z.string().nullable().optional(),
		address_1: z.string().nullable().optional(),
		address_2: z.string().nullable().optional(),
		city: z.string().nullable().optional(),
		province: z.string().nullable().optional(),
		country_code: z.string().nullable().optional(),
		postal_code: z.string().nullable().optional(),
		phone: z.string().nullable().optional()
	})
	.strict()

const promotionInputSchema = z
	.object({
		code: z.string().min(1),
		discount_type: z.enum(['percentage', 'fixed']),
		discount_value: z.number().positive(),
		end_date: z.string().datetime().nullable().optional()
	})
	.strict()

export const AdminCreateAffiliateSchema = z
	.object({
		name: z.string().min(1),
		email: z.string().email(),
		phone: z.string().nullable().optional(),
		currency_code: z.string().nullable().optional(),
		address: addressSchema,
		first_promotion: promotionInputSchema
	})
	.strict()
export type AdminCreateAffiliateType = z.infer<typeof AdminCreateAffiliateSchema>

export const AdminUpdateAffiliateSchema = z
	.object({
		name: z.string().min(1).optional(),
		email: z.string().email().optional(),
		phone: z.string().nullable().optional(),
		currency_code: z.string().nullable().optional(),
		primary_address_id: z.string().optional(),
		status: z.enum(['active', 'restricted', 'inactive']).optional()
	})
	.strict()
export type AdminUpdateAffiliateType = z.infer<typeof AdminUpdateAffiliateSchema>

export const AdminListAffiliatesSchema = z
	.object({
		q: z.string().optional(),
		status: z.union([z.enum(['active', 'restricted', 'inactive']), z.array(z.enum(['active', 'restricted', 'inactive']))]).optional(),
		offset: z.coerce.number().int().min(0).optional(),
		limit: z.coerce.number().int().min(1).max(200).optional(),
		order: z.string().optional()
	})
	.strict()
export type AdminListAffiliatesType = z.infer<typeof AdminListAffiliatesSchema>

export const AdminDeleteAffiliatesSchema = z.object({ ids: z.array(z.string()).min(1) }).strict()
export type AdminDeleteAffiliatesType = z.infer<typeof AdminDeleteAffiliatesSchema>

export const AdminAddAddressSchema = addressSchema
export type AdminAddAddressType = z.infer<typeof AdminAddAddressSchema>

export const AdminUpdateAddressSchema = addressSchema.partial()
export type AdminUpdateAddressType = z.infer<typeof AdminUpdateAddressSchema>

export const AdminCreateAffiliatePromotionSchema = promotionInputSchema
export type AdminCreateAffiliatePromotionType = z.infer<typeof AdminCreateAffiliatePromotionSchema>

export const AdminUpdateAffiliatePromotionSchema = z
	.object({
		code: z.string().min(1).optional(),
		discount_value: z.number().positive().optional(),
		end_date: z.string().datetime().nullable().optional()
	})
	.strict()
export type AdminUpdateAffiliatePromotionType = z.infer<typeof AdminUpdateAffiliatePromotionSchema>

export const AdminGetStatsSchema = z
	.object({
		basis: z.enum(['placed', 'captured', 'completed']).optional(),
		window: z.enum(['day', 'week', 'month', 'year', 'all']).optional(),
		promotion_id: z.string().optional()
	})
	.strict()
export type AdminGetStatsType = z.infer<typeof AdminGetStatsSchema>
