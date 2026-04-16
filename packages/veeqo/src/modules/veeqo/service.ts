import { RateLimit } from 'async-sema'
import { MedusaService } from '@medusajs/framework/utils'
import { InferTypeOf, Logger } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import {
	ProductForVeeqoProductInput,
	VeeqoChannelDTO,
	VeeqoChannelInput,
	VeeqoCustomerDTO,
	VeeqoCustomerInput,
	VeeqoDeliveryMethodDTO,
	VeeqoDeliveryMethodInput,
	VeeqoOptions,
	VeeqoOrderDTO,
	VeeqoOrderInput,
	VeeqoProductDTO,
	VeeqoProductInput,
	VeeqoSellableDTO,
	VeeqoShipmentDTO,
	VeeqoStockEntryInput,
	VeeqoTrackingEventDTO,
	VeeqoWarehouseDTO,
	VeeqoWarehouseInput
} from './types'
import { VeeqoChannel } from './models/veeqo-channel'
import { VeeqoCustomer } from './models/veeqo-customer'
import { VeeqoDeliveryMethod } from './models/veeqo-delivery-method'
import { VeeqoOrder } from './models/veeqo-order'
import { VeeqoProduct } from './models/veeqo-product'
import { VeeqoSellable } from './models/veeqo-sellable'
import { VeeqoShipment } from './models/veeqo-shipment'
import { VeeqoWarehouse } from './models/veeqo-warehouse'

export type VeeqoChannel = InferTypeOf<typeof VeeqoChannel>
export type VeeqoCustomer = InferTypeOf<typeof VeeqoCustomer>
export type VeeqoDeliveryMethod = InferTypeOf<typeof VeeqoDeliveryMethod>
export type VeeqoOrder = InferTypeOf<typeof VeeqoOrder>
export type VeeqoProduct = InferTypeOf<typeof VeeqoProduct>
export type VeeqoSellable = InferTypeOf<typeof VeeqoSellable>
export type VeeqoShipment = InferTypeOf<typeof VeeqoShipment>
export type VeeqoWarehouse = InferTypeOf<typeof VeeqoWarehouse>

type FetchOptions = {
	path: string
	method?: string
	headers?: {}
	body?: any
}

export class VeeqoService extends MedusaService({
	VeeqoChannel,
	VeeqoCustomer,
	VeeqoDeliveryMethod,
	VeeqoOrder,
	VeeqoProduct,
	VeeqoSellable,
	VeeqoShipment,
	VeeqoWarehouse
}) {
	protected logger_: Logger
	protected readonly options_: VeeqoOptions
	// The Veeqo API currently has a rate limit of 5 requests per second with a bucket size of 100.
	// See https://developers.veeqo.com/getting-started/introduction/#limits
	// The worker and main threads share the same account/api key, so throttle to 3 requests per second.
	// This maximizes throughput but may very rarely result in a 429 if the bucket is full. In that case, the request will be retried with exponential backoff up to the number of times specified in options.retry.
	private rateLimit = RateLimit(3)
	private delay = (durationMs: number) => new Promise(resolve => setTimeout(resolve, durationMs))
	private url: string
	private headers: { [key: string]: string }

	constructor(
		container: {
			logger: Logger
		},
		options: VeeqoOptions
	) {
		super(...arguments)
		this.options_ = options
		this.logger_ = container.logger
		this.headers = {
			...(this.options_.headers || {}),
			'x-api-key': this.options_.apiKey
		}
		this.url = this.options_.veeqoUrl || 'https://api.veeqo.com'
	}

	private async fetch(
		options: FetchOptions,
		retry: number = this.options_.retry || 1
	): Promise<Response> {
		let { path, method = 'GET', body = null, ...rest } = options
		let headers: any = {}
		if (this.headers) {
			for (const [key, value] of Object.entries(this.headers)) {
				headers[key] = value
			}
		}
		if (body && Object.keys(body).length != 0) {
			headers['Accept'] = 'application/json'
			headers['Content-Type'] = 'application/json'
			body = JSON.stringify(options.body)
		}
		try {
			const controller = new AbortController()
			const id = setTimeout(() => controller.abort(), this.options_.timeout || 5000)
			await this.rateLimit()
			const response = await fetch(`${this.url}${path}`, {
				method,
				body,
				headers,
				...rest,
				signal: controller.signal
			})
			clearTimeout(id)
			return response
		} catch (err: any) {
			if (retry > 0) {
				await this.rateLimit()
				// add exponential backoff with jitter
				const backoffTime = Math.pow(2, this.options_.retry - retry) * 100 + Math.random() * 100
				this.logger_.warn(
					`[VEEQO]: Veeqo API request failed. Retrying in ${backoffTime}ms... (${retry} retries left)`
				)
				await this.delay(backoffTime)
				return await this.fetch(options, retry - 1)
			} else {
				return Promise.reject(err)
			}
		}
	}

	/**
	 * Fetches a channel from Veeqo by Veeqo Channel ID. Returns the Veeqo channel or null if not found.
	 */
	async fetchChannel(veeqoChannelId: number): Promise<VeeqoChannelDTO> {
		return this.fetch({
			path: `/channels/${veeqoChannelId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo channel with veeqo_channel_id ${veeqoChannelId} not found`
				)
			})
	}

	/**
	 * Fetches a customer from Veeqo by Veeqo Customer ID. Returns the Veeqo customer or null if not found.
	 */
	async fetchCustomer(veeqoCustomerId: number): Promise<VeeqoCustomerDTO> {
		return await this.fetch({
			path: `/customers/${veeqoCustomerId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo customer with veeqo_customer_id ${veeqoCustomerId} not found`
				)
			})
	}

	/**
	 * Fetches a delivery method from Veeqo by Veeqo Delivery Method ID. Returns the Veeqo delivery method or null if not found.
	 */
	async fetchDeliveryMethod(veeqoDeliveryMethodId: number): Promise<VeeqoDeliveryMethodDTO> {
		return await this.fetch({
			path: `/delivery_methods/${veeqoDeliveryMethodId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo delivery method with veeqo_delivery_method_id ${veeqoDeliveryMethodId} not found`
				)
			})
	}

	/**
	 * Fetches an order from Veeqo by Veeqo Order ID. Returns the Veeqo order or null if not found.
	 */
	async fetchOrder(veeqoOrderId: number): Promise<VeeqoOrderDTO> {
		return await this.fetch({
			path: `/orders/${veeqoOrderId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo order with veeqo_order_id ${veeqoOrderId} not found`
				)
			})
	}

	/**
	 * Fetches a product from Veeqo by Veeqo Product ID. Returns the Veeqo product or null if not found.
	 */
	async fetchProduct(veeqoProductId: number): Promise<VeeqoProductDTO> {
		return await this.fetch({
			path: `/products/${veeqoProductId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo product with veeqo_product_id ${veeqoProductId} not found`
				)
			})
	}

	/**
	 * Fetches a shipment from Veeqo by Veeqo Shipment ID. Returns the Veeqo shipment or null if not found.
	 */
	async fetchShipment(shipmentId: number): Promise<VeeqoShipmentDTO> {
		return await this.fetch({
			path: `/shipments/${shipmentId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo shipment with veeqo_shipment_id ${shipmentId} not found`
				)
			})
	}

	/**
	 * Fetches tracking events for a shipment from Veeqo by Veeqo Shipment ID. Returns an array of tracking events.
	 */
	async fetchTrackingEvents(shipmentId: number): Promise<VeeqoTrackingEventDTO[]> {
		return await this.fetch({
			path: `/shipments/tracking_events/${shipmentId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Tracking events for shipment with veeqo_shipment_id ${shipmentId} not found`
				)
			})
	}

	/**
	 * Fetches a warehouse (Stock Location) from Veeqo by Veeqo Warehouse ID. Returns the Veeqo warehouse or null if not found.
	 */
	async fetchWarehouse(warehouseId: number): Promise<VeeqoWarehouseDTO> {
		return await this.fetch({
			path: `/warehouses/${warehouseId}`,
			method: 'GET'
		})
			.then(response => response.json())
			.catch(err => {
				this.logger_.error(err)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Veeqo warehouse with veeqo_warehouse_id ${warehouseId} not found`
				)
			})
	}

	/**
	 * Adds a channel to Veeqo and links it to the corresponding sales channel in Medusa. First argument is the Medusa sales channel ID, second argument is the input data to create the channel in Veeqo. Returns the created Veeqo channel.
	 */
	async addChannel(
		salesChannelId: string,
		channelInput: VeeqoChannelInput
	): Promise<VeeqoChannelDTO> {
		const veeqoChannel = (await this.fetch({
			path: `/channels`,
			method: 'POST',
			body: { channel: channelInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoChannelDTO

		if (!veeqoChannel?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to create channel in Veeqo for sales channel ${salesChannelId}`
			)
		}

		await this.createVeeqoChannels({
			sales_channel_id: salesChannelId,
			veeqo_channel_id: veeqoChannel.id
		})

		return veeqoChannel
	}

	/**
	 * Adds a customer to Veeqo and links it to the corresponding customer in Medusa. First argument is the Medusa customer ID, second argument is the input data to create the customer in Veeqo. Returns the created Veeqo customer.
	 */
	async addCustomer(
		customerId: string,
		customerInput: VeeqoCustomerInput
	): Promise<VeeqoCustomerDTO> {
		const veeqoCustomer = (await this.fetch({
			path: `/customers`,
			method: 'POST',
			body: { customer: customerInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoCustomerDTO

		if (!veeqoCustomer?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to create customer in Veeqo for customer ${customerId}`
			)
		}

		await this.createVeeqoCustomers({
			customer_id: customerId,
			veeqo_customer_id: veeqoCustomer.id
		})

		return veeqoCustomer
	}

	/**
	 * Adds a delivery method to Veeqo and links it to the corresponding shipping option in Medusa. First argument is the Medusa shipping option ID, second argument is the input data to create the delivery method in Veeqo. Returns the created Veeqo delivery method.
	 */
	async addDeliveryMethod(
		shippingOptionId: string,
		deliveryMethodInput: VeeqoDeliveryMethodInput
	): Promise<VeeqoDeliveryMethodDTO> {
		const veeqoDeliveryMethod = (await this.fetch({
			path: `/delivery_methods`,
			method: 'POST',
			body: deliveryMethodInput
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoDeliveryMethodDTO

		if (!veeqoDeliveryMethod?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to create delivery method in Veeqo for shipping option ${shippingOptionId}`
			)
		}

		await this.createVeeqoDeliveryMethods({
			shipping_option_id: shippingOptionId,
			veeqo_delivery_method_id: veeqoDeliveryMethod.id
		})

		return veeqoDeliveryMethod
	}

	/**
	 * Adds an order to Veeqo and links it to the corresponding order in Medusa. First argument is the Medusa order ID, second argument is the input data to create the order in Veeqo. Returns the created Veeqo order.
	 */
	async addOrder(orderId: string, orderInput: VeeqoOrderInput): Promise<VeeqoOrderDTO> {
		const veeqoOrder = (await this.fetch({
			path: `/orders`,
			method: 'POST',
			body: { order: orderInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoOrderDTO

		if (!veeqoOrder?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to create order in Veeqo for order ${orderId}`
			)
		}

		// Resolve the local VeeqoCustomer DB record so we can set the required FK
		const dbCustomers = await this.listVeeqoCustomers(
			{ veeqo_customer_id: orderInput.customer_id },
			{ take: 1 }
		)
		const dbCustomer = dbCustomers[0]

		await this.createVeeqoOrders({
			order_id: orderId,
			veeqo_order_id: veeqoOrder.id,
			...(dbCustomer ? { veeqo_customer_id: dbCustomer.id } : {})
		} as any)

		return veeqoOrder
	}

	/**
	 * Adds a product to Veeqo and links it to the corresponding product in Medusa. First argument is the Medusa product ID, second argument is the input data to create the product in Veeqo. Returns the created Veeqo product.
	 */
	async addProduct(
		product: ProductForVeeqoProductInput,
		productInput: VeeqoProductInput
	): Promise<VeeqoProductDTO> {
		const veeqoProduct = (await this.fetch({
			path: `/products`,
			method: 'POST',
			body: { product: productInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoProductDTO

		if (!veeqoProduct?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to create product in Veeqo for product ${product.id}`
			)
		}

		await this.createVeeqoProducts({
			product_id: product.id,
			veeqo_product_id: veeqoProduct.id
		})

		for (const sellable of veeqoProduct.sellables) {
			const matchingVariant = product.variants?.find(
				variant => variant.sku === sellable.sku_code
			)
			if (matchingVariant) {
				await this.createVeeqoSellables({
					product_variant_id: matchingVariant.id,
					veeqo_sellable_id: sellable.id
				})
			}
		}

		await this.addInfiniteStockForSellables(veeqoProduct.sellables)

		return veeqoProduct
	}

	/**
	 * Adds a warehouse (Stock Location) to Veeqo and links it to the corresponding warehouse in Medusa. First argument is the Medusa stock location ID, second argument is the input data to create the warehouse in Veeqo. Returns the created Veeqo warehouse.
	 */
	async addWarehouse(
		stockLocationId: string,
		warehouseInput: VeeqoWarehouseInput
	): Promise<VeeqoWarehouseDTO> {
		const veeqoWarehouse = (await this.fetch({
			path: `/warehouses`,
			method: 'POST',
			body: warehouseInput
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoWarehouseDTO

		if (!veeqoWarehouse?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to create warehouse in Veeqo for stock location ${stockLocationId}`
			)
		}

		await this.createVeeqoWarehouses({
			stock_location_id: stockLocationId,
			veeqo_warehouse_id: veeqoWarehouse.id
		})

		return veeqoWarehouse
	}

	/**
	 * Updates a channel in Veeqo. First argument is the Veeqo channel ID, second argument is the input data to update the channel in Veeqo. Returns the updated Veeqo channel.
	 */
	async updateChannel(
		veeqoChannelId: number,
		veeqoChannelInput: VeeqoChannelInput
	): Promise<VeeqoChannelDTO> {
		const veeqoChannel = (await this.fetch({
			path: `/channels/${veeqoChannelId}`,
			method: 'PUT',
			body: veeqoChannelInput
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoChannelDTO

		if (!veeqoChannel?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to update channel in Veeqo with Veeqo ID ${veeqoChannelId}`
			)
		}
		return veeqoChannel
	}

	/**
	 * Updates a customer in Veeqo. First argument is the Veeqo customer ID, second argument is the input data to update the customer in Veeqo. Returns the updated Veeqo customer.
	 */
	async updateCustomer(
		veeqoCustomerId: number,
		veeqoCustomerInput: VeeqoCustomerInput
	): Promise<VeeqoCustomerDTO> {
		const veeqoCustomer = (await this.fetch({
			path: `/customers/${veeqoCustomerId}`,
			method: 'PUT',
			body: { customer: veeqoCustomerInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoCustomerDTO

		if (!veeqoCustomer?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to update customer in Veeqo with Veeqo ID ${veeqoCustomerId}`
			)
		}
		return veeqoCustomer
	}

	/**
	 * Updates a delivery method in Veeqo. First argument is the Veeqo delivery method ID, second argument is the input data to update the delivery method in Veeqo. Returns the updated Veeqo delivery method.
	 */
	async updateDeliveryMethod(
		veeqoDeliveryMethodId: number,
		veeqoDeliveryMethodInput: VeeqoDeliveryMethodInput
	): Promise<VeeqoDeliveryMethodDTO> {
		const veeqoDeliveryMethod = (await this.fetch({
			path: `/delivery_methods/${veeqoDeliveryMethodId}`,
			method: 'PUT',
			body: veeqoDeliveryMethodInput
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoDeliveryMethodDTO

		if (!veeqoDeliveryMethod?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to update delivery method in Veeqo with Veeqo ID ${veeqoDeliveryMethodId}`
			)
		}
		return veeqoDeliveryMethod
	}

	/**
	 * Updates an order in Veeqo. First argument is the Veeqo order ID, second argument is the input data to update the order in Veeqo. Returns the updated Veeqo order.
	 */
	async updateOrder(
		veeqoOrderId: number,
		veeqoOrderInput: VeeqoOrderInput
	): Promise<VeeqoOrderDTO> {
		const veeqoOrder = (await this.fetch({
			path: `/orders/${veeqoOrderId}`,
			method: 'PUT',
			body: { order: veeqoOrderInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoOrderDTO

		if (!veeqoOrder?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to update order in Veeqo with Veeqo ID ${veeqoOrderId}`
			)
		}
		return veeqoOrder
	}

	/**
	 * Updates a product in Veeqo. First argument is the Veeqo product ID, second argument is the input data to update the product in Veeqo. Returns the updated Veeqo product.
	 */
	async updateProduct(
		veeqoProductId: number,
		veeqoProductInput: VeeqoProductInput
	): Promise<VeeqoProductDTO> {
		const veeqoProduct = (await this.fetch({
			path: `/products/${veeqoProductId}`,
			method: 'PUT',
			body: { product: veeqoProductInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoProductDTO

		if (!veeqoProduct?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to update product in Veeqo with Veeqo ID ${veeqoProductId}`
			)
		}
		const needStockEntryUpdate = veeqoProduct.sellables?.filter(sellable => {
			sellable.inventory.infinite === false
		})
		if (needStockEntryUpdate?.length)
			await this.addInfiniteStockForSellables(needStockEntryUpdate)
		return veeqoProduct
	}

	/**
	 * Updates a warehouse (Stock Location) in Veeqo. First argument is the Veeqo warehouse ID, second argument is the input data to update the warehouse in Veeqo. Returns the updated Veeqo warehouse.
	 */
	async updateWarehouse(
		veeqoWarehouseId: number,
		veeqoWarehouseInput: VeeqoWarehouseInput
	): Promise<VeeqoWarehouseDTO> {
		const veeqoWarehouse = (await this.fetch({
			path: `/warehouses/${veeqoWarehouseId}`,
			method: 'PUT',
			body: { warehouse: veeqoWarehouseInput }
		})
			.then(response => response.json())
			.catch(err => this.logger_.error(err))) as VeeqoWarehouseDTO

		if (!veeqoWarehouse?.id) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to update warehouse in Veeqo with Veeqo ID ${veeqoWarehouseId}`
			)
		}
		return veeqoWarehouse
	}

	/**
	 * Deletes a channel in Veeqo by Medusa sales channel ID and unlinks it in Medusa.
	 */
	async deleteChannel(salesChannelId: string): Promise<void> {
		const [veeqoChannel] = await this.listVeeqoChannels({ sales_channel_id: salesChannelId })
		if (!veeqoChannel) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Veeqo channel linked to sales channel ${salesChannelId} not found`
			)
		}
		const { id, veeqo_channel_id } = veeqoChannel
		const success = await this.fetch({
			path: `/channels/${veeqo_channel_id}`,
			method: 'DELETE'
		})
			.then(async response => { await response.text(); return response.ok })
			.catch(err => this.logger_.error(err))
		if (!success) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to delete channel in Veeqo with Veeqo ID ${veeqo_channel_id}`
			)
		}
		return this.deleteVeeqoChannels(id)
	}

	/**
	 * Deletes a customer in Veeqo by Medusa customer ID. Since Veeqo does not allow deleting customers, this only unlinks the customer in Medusa so it is no longer associated with the Veeqo customer.
	 */
	async deleteCustomer(customerId: string): Promise<void> {
		const [veeqoCustomer] = await this.listVeeqoCustomers({ customer_id: customerId })
		return this.deleteVeeqoCustomers(veeqoCustomer?.id)
	}

	/**
	 * Deletes a delivery method in Veeqo by Medusa shipping option ID and unlinks it in Medusa.
	 */
	async deleteDeliveryMethod(shippingOptionId: string): Promise<void> {
		const [veeqoDeliveryMethod] = await this.listVeeqoDeliveryMethods({
			shipping_option_id: shippingOptionId
		})
		if (!veeqoDeliveryMethod) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Veeqo delivery method linked to shipping option ${shippingOptionId} not found`
			)
		}
		const { id, veeqo_delivery_method_id } = veeqoDeliveryMethod
		const success = await this.fetch({
			path: `/delivery_methods/${veeqo_delivery_method_id}`,
			method: 'DELETE'
		})
			.then(response => response.ok)
			.catch(err => this.logger_.error(err))
		if (!success) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to delete delivery method in Veeqo with Veeqo ID ${veeqo_delivery_method_id}`
			)
		}
		return this.deleteVeeqoDeliveryMethods(id)
	}

	/**
	 * Cancels an order in Veeqo by Medusa order ID and unlinks it in Medusa. Veeqo does not allow deleting orders, but canceling the order will hide it in the Veeqo interface.
	 */
	async deleteOrder(orderId: string, cancelReason: string = ''): Promise<void> {
		const [veeqoOrder] = await this.listVeeqoOrders({ order_id: orderId })
		if (!veeqoOrder) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Veeqo order linked to order ${orderId} not found`
			)
		}
		const { id, veeqo_order_id } = veeqoOrder
		if (!cancelReason) cancelReason = 'Cancelled from Medusa'
		const success = await this.fetch({
			path: `/orders/${veeqo_order_id}/cancel`,
			method: 'PUT',
			body: {
				reason: cancelReason,
				send_veeqo_email: false
			}
		})
			.then(response => response.ok)
			.catch(err => this.logger_.error(err))
		if (!success) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to cancel order in Veeqo with Veeqo ID ${veeqo_order_id}`
			)
		}
		return this.deleteVeeqoOrders(id)
	}

	/**
	 * Deletes a product in Veeqo by Medusa product ID and unlinks it in Medusa.
	 */
	async deleteProduct(productId: string): Promise<void> {
		const [veeqoProduct] = await this.listVeeqoProducts({ product_id: productId })
		if (!veeqoProduct) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Veeqo product linked to product ${productId} not found`
			)
		}
		const { id, veeqo_product_id } = veeqoProduct
		const success = await this.fetch({
			path: `/products/${veeqo_product_id}`,
			method: 'DELETE'
		})
			.then(response => response.ok)
			.catch(err => this.logger_.error(err))
		if (!success) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to delete product in Veeqo with Veeqo ID ${veeqo_product_id}`
			)
		}
		return this.deleteVeeqoProducts(id)
	}

	/**
	 * Deletes a warehouse (Stock Location) in Veeqo by Medusa stock location ID and unlinks it in Medusa.
	 */
	async deleteWarehouse(stockLocationId: string): Promise<void> {
		const [veeqoWarehouse] = await this.listVeeqoWarehouses({
			stock_location_id: stockLocationId
		})
		if (!veeqoWarehouse) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Veeqo warehouse linked to stock location ${stockLocationId} not found`
			)
		}
		const { id, veeqo_warehouse_id } = veeqoWarehouse
		const success = await this.fetch({
			path: `/warehouses/${veeqo_warehouse_id}`,
			method: 'DELETE'
		})
			.then(response => response.ok)
			.catch(err => this.logger_.error(err))
		if (!success) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Failed to delete warehouse in Veeqo with Veeqo ID ${veeqo_warehouse_id}`
			)
		}
		return this.deleteVeeqoWarehouses(id)
	}

	async addInfiniteStockForSellables(sellables: VeeqoSellableDTO[]): Promise<void> {
		const warehouses = await this.listVeeqoWarehouses()
		for (const sellable of sellables) {
			const stockEntry: VeeqoStockEntryInput = {
				physical_stock_level: 200,
				infinite: true
			}
			for (const warehouse of warehouses) {
				await this.fetch({
					path: `/sellables/${sellable.id}/warehouses/${warehouse.veeqo_warehouse_id}/stock_entry`,
					method: 'PUT',
					body: { stock_entry: stockEntry }
				})
					.then(response => response?.json())
					.catch(err => this.logger_.error(err))
			}
		}
	}
}
