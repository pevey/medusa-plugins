import { defineLink } from '@medusajs/framework/utils'
import PromotionModule from '@medusajs/medusa/promotion'
import AffiliateModule from '../modules/affiliate'

export default defineLink(AffiliateModule.linkable.affiliate, {
	linkable: PromotionModule.linkable.promotion,
	isList: true
})
