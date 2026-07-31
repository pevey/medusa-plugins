import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import {
	AdminCreateAffiliateSchema,
	AdminUpdateAffiliateSchema,
	AdminListAffiliatesSchema,
	AdminDeleteAffiliatesSchema,
	AdminAddAddressSchema,
	AdminUpdateAddressSchema,
	AdminCreateAffiliatePromotionSchema,
	AdminUpdateAffiliatePromotionSchema,
	AdminGetStatsSchema
} from './validators'

export default defineMiddlewares({
	routes: [
		{
			matcher: '/admin/affiliates',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminListAffiliatesSchema, {
					defaults: [
						'id',
						'name',
						'email',
						'phone',
						'status',
						'currency_code',
						'created_at',
						'addresses.id',
						'addresses.affiliate_id',
						'addresses.first_name',
						'addresses.last_name',
						'addresses.company',
						'addresses.address_1',
						'addresses.address_2',
						'addresses.city',
						'addresses.province',
						'addresses.country_code',
						'addresses.postal_code',
						'addresses.phone'
					],
					defaultLimit: 20,
					isList: true
				})
			]
		},
		{
			matcher: '/admin/affiliates',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminCreateAffiliateSchema)]
		},
		{
			matcher: '/admin/affiliates',
			method: ['DELETE'],
			middlewares: [validateAndTransformBody(AdminDeleteAffiliatesSchema)]
		},
		{
			matcher: '/admin/affiliates/:id',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminListAffiliatesSchema.partial(), {
					defaults: [
						'id',
						'name',
						'email',
						'phone',
						'status',
						'currency_code',
						'primary_address_id',
						'created_at',
						'addresses.id',
						'addresses.affiliate_id',
						'addresses.first_name',
						'addresses.last_name',
						'addresses.company',
						'addresses.address_1',
						'addresses.address_2',
						'addresses.city',
						'addresses.province',
						'addresses.country_code',
						'addresses.postal_code',
						'addresses.phone',
						'promotions.id',
						'promotions.code',
						'promotions.status',
						'promotions.is_automatic',
						'promotions.campaign.id',
						'promotions.campaign.ends_at',
						'promotions.application_method.type',
						'promotions.application_method.value'
					],
					isList: false
				})
			]
		},
		{
			matcher: '/admin/affiliates/:id',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminUpdateAffiliateSchema)]
		},
		{
			matcher: '/admin/affiliates/:id/addresses',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminAddAddressSchema)]
		},
		{
			matcher: '/admin/affiliates/:id/addresses/:addressId',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminUpdateAddressSchema)]
		},
		{
			matcher: '/admin/affiliates/:id/promotions',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminCreateAffiliatePromotionSchema)]
		},
		{
			matcher: '/admin/affiliates/:id/promotions/:promotionId',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminUpdateAffiliatePromotionSchema)]
		},
		{
			matcher: '/admin/affiliates/:id/stats',
			method: ['GET'],
			middlewares: [validateAndTransformQuery(AdminGetStatsSchema, {})]
		}
	]
})
