import { Client, Admin as MedusaAdmin } from '@medusajs/js-sdk'
import { createAdminReviewResource } from './resources/admin/review'

type CoreAdmin = InstanceType<typeof MedusaAdmin>

export class Admin {
	private core: CoreAdmin

	// Custom plugin resources
	public review: ReturnType<typeof createAdminReviewResource>

	constructor(client: Client) {
		this.core = new MedusaAdmin(client)
		this.review = createAdminReviewResource(client)
	}

	// ── Delegated core resources ─────────────────────────────────────────────

	get apiKey(): CoreAdmin['apiKey'] { return this.core.apiKey }
	get campaign(): CoreAdmin['campaign'] { return this.core.campaign }
	get claim(): CoreAdmin['claim'] { return this.core.claim }
	get currency(): CoreAdmin['currency'] { return this.core.currency }
	get customer(): CoreAdmin['customer'] { return this.core.customer }
	get customerGroup(): CoreAdmin['customerGroup'] { return this.core.customerGroup }
	get draftOrder(): CoreAdmin['draftOrder'] { return this.core.draftOrder }
	get exchange(): CoreAdmin['exchange'] { return this.core.exchange }
	get fulfillment(): CoreAdmin['fulfillment'] { return this.core.fulfillment }
	get fulfillmentProvider(): CoreAdmin['fulfillmentProvider'] { return this.core.fulfillmentProvider }
	get fulfillmentSet(): CoreAdmin['fulfillmentSet'] { return this.core.fulfillmentSet }
	get inventoryItem(): CoreAdmin['inventoryItem'] { return this.core.inventoryItem }
	get invite(): CoreAdmin['invite'] { return this.core.invite }
	get locale(): CoreAdmin['locale'] { return this.core.locale }
	get notification(): CoreAdmin['notification'] { return this.core.notification }
	get order(): CoreAdmin['order'] { return this.core.order }
	get orderEdit(): CoreAdmin['orderEdit'] { return this.core.orderEdit }
	get payment(): CoreAdmin['payment'] { return this.core.payment }
	get paymentCollection(): CoreAdmin['paymentCollection'] { return this.core.paymentCollection }
	get plugin(): CoreAdmin['plugin'] { return this.core.plugin }
	get priceList(): CoreAdmin['priceList'] { return this.core.priceList }
	get pricePreference(): CoreAdmin['pricePreference'] { return this.core.pricePreference }
	get product(): CoreAdmin['product'] { return this.core.product }
	get productCategory(): CoreAdmin['productCategory'] { return this.core.productCategory }
	get productCollection(): CoreAdmin['productCollection'] { return this.core.productCollection }
	get productTag(): CoreAdmin['productTag'] { return this.core.productTag }
	get productType(): CoreAdmin['productType'] { return this.core.productType }
	get productVariant(): CoreAdmin['productVariant'] { return this.core.productVariant }
	get promotion(): CoreAdmin['promotion'] { return this.core.promotion }
	get refundReason(): CoreAdmin['refundReason'] { return this.core.refundReason }
	get region(): CoreAdmin['region'] { return this.core.region }
	get reservation(): CoreAdmin['reservation'] { return this.core.reservation }
	get return(): CoreAdmin['return'] { return this.core.return }
	get returnReason(): CoreAdmin['returnReason'] { return this.core.returnReason }
	get salesChannel(): CoreAdmin['salesChannel'] { return this.core.salesChannel }
	get shippingOption(): CoreAdmin['shippingOption'] { return this.core.shippingOption }
	get shippingOptionType(): CoreAdmin['shippingOptionType'] { return this.core.shippingOptionType }
	get shippingProfile(): CoreAdmin['shippingProfile'] { return this.core.shippingProfile }
	get stockLocation(): CoreAdmin['stockLocation'] { return this.core.stockLocation }
	get store(): CoreAdmin['store'] { return this.core.store }
	get taxProvider(): CoreAdmin['taxProvider'] { return this.core.taxProvider }
	get taxRate(): CoreAdmin['taxRate'] { return this.core.taxRate }
	get taxRegion(): CoreAdmin['taxRegion'] { return this.core.taxRegion }
	get translation(): CoreAdmin['translation'] { return this.core.translation }
	get upload(): CoreAdmin['upload'] { return this.core.upload }
	get user(): CoreAdmin['user'] { return this.core.user }
	get views(): CoreAdmin['views'] { return this.core.views }
	get workflowExecution(): CoreAdmin['workflowExecution'] { return this.core.workflowExecution }
}
