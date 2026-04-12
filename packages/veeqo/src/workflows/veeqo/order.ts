import {
	createStep,
	createWorkflow,
	StepResponse,
	transform,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import {
	OrderForVeeqoOrderInput,
	VeeqoAddress,
	VeeqoOrderDTO,
	VeeqoOrderInput
} from '../../modules/veeqo/types'
import { VeeqoService } from '../../modules/veeqo/service'
import { syncCustomerToVeeqoWorkflow } from './customer'
import { syncVeeqoOrderShipmentsWorkflow } from './shipments'

// ─── Mapping helpers ──────────────────────────────────────────────────────────

const mapShippingAddressToVeeqoAddress = (order: OrderForVeeqoOrderInput): VeeqoAddress => {
	const addr = order.shipping_address
	return {
		first_name: addr?.first_name ?? '',
		last_name: addr?.last_name ?? '',
		email: order.customer?.email ?? '',
		address1: addr?.address_1 ?? '',
		...(addr?.address_2 ? { address2: addr.address_2 } : {}),
		city: addr?.city ?? '',
		state: addr?.province?.toUpperCase() ?? '',
		country: addr?.country_code?.toUpperCase() ?? '',
		zip: addr?.postal_code?.toUpperCase() ?? '',
		...(addr?.phone ? { phone: addr.phone } : {})
	}
}

const mapOrderToVeeqoOrderInput = (
	order: OrderForVeeqoOrderInput,
	veeqoCustomerId: number
): VeeqoOrderInput => {
	const missingFields: string[] = []

	const channelId = order.sales_channel?.veeqo_channel?.veeqo_channel_id
	if (!channelId) missingFields.push('sales_channel.veeqo_channel.veeqo_channel_id')

	const deliveryMethodId =
		order.shipping_methods?.[0]?.shipping_option?.veeqo_delivery_method?.veeqo_delivery_method_id
	if (!deliveryMethodId)
		missingFields.push(
			'shipping_methods[0].shipping_option.veeqo_delivery_method.veeqo_delivery_method_id'
		)

	if (!order.items?.length) missingFields.push('items')

	const itemsMissingSellable = (order.items ?? []).filter(
		item => !item.variant?.veeqo_sellable?.veeqo_sellable_id
	)
	if (itemsMissingSellable.length) {
		missingFields.push(
			`items[${itemsMissingSellable.map(item => item.id).join(', ')}].variant.veeqo_sellable.veeqo_sellable_id`
		)
	}

	if (missingFields.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Order ${order.id} is missing required fields for Veeqo order input: ${missingFields.join(', ')}`
		)
	}

	return {
		channel_id: channelId!,
		customer_id: veeqoCustomerId,
		deliver_to_attributes: mapShippingAddressToVeeqoAddress(order),
		delivery_method_id: deliveryMethodId!,
		number: order.id,
		send_notification_email: false,
		...(order.discount_total != null ? { total_discounts: order.discount_total } : {}),
		line_items_attributes: order.items!.map(item => ({
			sellable_id: Number(item.variant!.veeqo_sellable!.veeqo_sellable_id!),
			price_per_unit: item.unit_price,
			quantity: item.quantity,
			...(item.discount_total != null && item.discount_total > 0 && item.quantity > 0
				? { taxless_discount_per_unit: Math.floor(item.discount_total / item.quantity) }
				: {})
		})),
		payment_attributes: {
			payment_type:
				order.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id ?? 'manual',
			reference_number: order.id
		}
	}
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export const getOrderDetailsStep = createStep(
	'get-medusa-order-details-step',
	async (order_id: string, { container }) => {
		const query = container.resolve('query')

		// Query only ORM-native fields first.  Cross-module relations (customer,
		// sales_channel, items.variant, shipping_methods.shipping_option, veeqo_order)
		// are resolved in separate queries below to avoid a MikroORM populate error
		// caused by the order module's custom repository receiving cross-module paths.
		const { data: orders } = await query.graph({
			entity: 'order',
			fields: [
				'id',
				'customer_id',
				'sales_channel_id',
				'shipping_address.first_name',
				'shipping_address.last_name',
				'shipping_address.address_1',
				'shipping_address.address_2',
				'shipping_address.city',
				'shipping_address.province',
				'shipping_address.country_code',
				'shipping_address.postal_code',
				'shipping_address.phone',
				'items.id',
				'items.unit_price',
				'items.detail.quantity',
				'items.variant_id',
				'shipping_methods.id',
				'shipping_methods.amount',
				'shipping_methods.shipping_option_id'
			],
			filters: { id: order_id }
		})
		const order = orders[0]
		if (!order) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id ${order_id} not found`)
		}

		type AnyRecord = Record<string, any>

		const orderItems = ((order as AnyRecord).items ?? []) as AnyRecord[]
		const orderShippingMethods = ((order as AnyRecord).shipping_methods ?? []) as AnyRecord[]
		const customerId = (order as AnyRecord).customer_id as string | undefined
		const salesChannelId = (order as AnyRecord).sales_channel_id as string | undefined
		const variantIds = orderItems.map(i => i.variant_id as string).filter(Boolean)
		const shippingOptionIds = orderShippingMethods
			.map(sm => sm.shipping_option_id as string)
			.filter(Boolean)

		// Resolve all cross-module links in parallel
		const [
			{ data: veeqoOrders },
			{ data: customers },
			{ data: salesChannels },
			variantMap,
			shippingOptionMap
		] = await Promise.all([
			query.graph({
				entity: 'veeqo_order',
				fields: ['veeqo_order_id'],
				filters: { order_id }
			}),
			query.graph({
				entity: 'customer',
				fields: ['id', 'email', 'phone', 'veeqo_customer.veeqo_customer_id'],
				...(customerId ? { filters: { id: customerId } } : { filters: {} })
			}),
			query.graph({
				entity: 'sales_channel',
				fields: ['id', 'veeqo_channel.veeqo_channel_id'],
				...(salesChannelId ? { filters: { id: salesChannelId } } : { filters: {} })
			}),
			variantIds.length > 0
				? query
						.graph({
							entity: 'product_variant',
							fields: ['id', 'veeqo_sellable.veeqo_sellable_id'],
							filters: { id: variantIds }
						})
						.then(({ data: variants }) =>
							Object.fromEntries((variants as AnyRecord[]).map(v => [v.id, v]))
						)
				: Promise.resolve({} as Record<string, AnyRecord>),
			shippingOptionIds.length > 0
				? query
						.graph({
							entity: 'shipping_option',
							fields: ['id', 'veeqo_delivery_method.veeqo_delivery_method_id'],
							filters: { id: shippingOptionIds }
						})
						.then(({ data: shippingOptions }) =>
							Object.fromEntries((shippingOptions as AnyRecord[]).map(so => [so.id, so]))
						)
				: Promise.resolve({} as Record<string, AnyRecord>)
		])

		// Assemble into the shape expected by OrderForVeeqoOrderInput
		const customer0 = customers[0] as AnyRecord | undefined
		const sc0 = salesChannels[0] as AnyRecord | undefined
		const veeqoOrder0 = veeqoOrders[0] as AnyRecord | undefined

		const result: OrderForVeeqoOrderInput = {
			id: (order as AnyRecord).id,
			shipping_address: (order as AnyRecord).shipping_address,
			customer: customer0
				? {
						id: customer0.id,
						email: customer0.email,
						phone: customer0.phone,
						veeqo_customer: customer0.veeqo_customer
							? { veeqo_customer_id: customer0.veeqo_customer.veeqo_customer_id }
							: undefined
					}
				: null,
			items: orderItems.map(item => {
				const variantId = item.variant_id as string | undefined
				const veeqoSellable = variantId ? variantMap[variantId]?.veeqo_sellable : undefined
				return {
					id: item.id,
					unit_price: item.unit_price,
					quantity: (item.detail as AnyRecord)?.quantity ?? item.quantity,
					discount_total: null,
					variant: variantId
						? {
								id: variantId,
								veeqo_sellable: veeqoSellable
									? { veeqo_sellable_id: String(veeqoSellable.veeqo_sellable_id) }
									: undefined
							}
						: null
				}
			}),
			sales_channel: sc0
				? {
						id: sc0.id,
						veeqo_channel: sc0.veeqo_channel
							? { veeqo_channel_id: sc0.veeqo_channel.veeqo_channel_id }
							: undefined
					}
				: null,
			shipping_methods: orderShippingMethods.map(sm => {
				const soId = sm.shipping_option_id as string | undefined
				const veeqoDm = soId ? shippingOptionMap[soId]?.veeqo_delivery_method : undefined
				return {
					id: sm.id,
					amount: sm.amount,
					shipping_option: soId
						? {
								id: soId,
								veeqo_delivery_method: veeqoDm
									? { veeqo_delivery_method_id: Number(veeqoDm.veeqo_delivery_method_id) }
									: undefined
							}
						: null
				}
			}),
			veeqo_order: veeqoOrder0 ? { veeqo_order_id: veeqoOrder0.veeqo_order_id } : null
		}

		return new StepResponse(result)
	}
)

export const processVeeqoStatusChangesStep = createStep(
	'process-veeqo-status-changes-step',
	async (data: { order: OrderForVeeqoOrderInput; veeqo_order: VeeqoOrderDTO }, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const [dbOrder] = await veeqoService.listVeeqoOrders({ order_id: data.order.id })
		if (!dbOrder) return new StepResponse(void 0)
		await syncVeeqoOrderShipmentsWorkflow(container).run({
			input: { veeqoOrderDbId: dbOrder.id as string }
		})
		return new StepResponse(void 0)
	}
)

// GET -----------------------------------------------------------

export const fetchOrderFromVeeqoStep = createStep(
	'fetch-order-from-veeqo-step',
	async (order_id: string, { container }) => {
		const query = container.resolve('query')
		const {
			data: [veeqo_order]
		} = await query.graph({
			entity: 'veeqo_order',
			fields: ['veeqo_order_id'],
			filters: { order_id }
		})
		const veeqoOrderId = veeqo_order?.veeqo_order_id
		if (!veeqoOrderId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo order found for order ${order_id}`
			)
		}
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoOrder = (await veeqoService.fetchOrder(veeqoOrderId)) as VeeqoOrderDTO
		return new StepResponse(veeqoOrder)
	}
)

export const getVeeqoOrderWorkflow = createWorkflow(
	'get-veeqo-order-workflow',
	(order_id: string) => {
		const veeqoOrder = fetchOrderFromVeeqoStep(order_id)
		return new WorkflowResponse(veeqoOrder)
	}
)

// ADD -----------------------------------------------------------

export const addOrderToVeeqoStep = createStep(
	'add-order-to-veeqo-step',
	async (
		{ order, veeqo_customer_id }: { order: OrderForVeeqoOrderInput; veeqo_customer_id: number },
		{ container }
	) => {
		if (order.veeqo_order?.veeqo_order_id) {
			return new StepResponse(void 0)
		}
		const veeqoOrderInput = mapOrderToVeeqoOrderInput(order, veeqo_customer_id)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoOrder = await veeqoService.addOrder(order.id, veeqoOrderInput)
		if (!veeqoOrder) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Unable to create order in Veeqo for order ${order.id}`
			)
		}
		return new StepResponse(veeqoOrder)
	}
)

export const addOrderToVeeqoWorkflow = createWorkflow(
	'add-order-to-veeqo-workflow',
	(order_id: string) => {
		const order = getOrderDetailsStep(order_id)
		const veeqoCustomer = syncCustomerToVeeqoWorkflow.runAsStep({
			input: transform(order, o => o.customer!.id)
		})
		const stepInput = transform({ order, veeqoCustomer }, ({ order, veeqoCustomer }) => ({
			order,
			veeqo_customer_id: (veeqoCustomer as any)?.id as number
		}))
		const veeqoOrder = addOrderToVeeqoStep(stepInput)
		return new WorkflowResponse(veeqoOrder)
	}
)

// UPDATE -----------------------------------------------------------

export const updateOrderInVeeqoStep = createStep(
	'update-order-in-veeqo-step',
	async (order: any, { container }) => {
		const veeqoOrderId = order.veeqo_order?.veeqo_order_id
		if (!veeqoOrderId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo order found for order ${order.id}`
			)
		}
		const veeqoOrderInput = {} as VeeqoOrderInput
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoOrder = await veeqoService.updateOrder(
			order.veeqo_order?.veeqo_order_id,
			veeqoOrderInput
		)
		return new StepResponse(veeqoOrder)
	}
)

export const updateOrderInVeeqoWorkflow = createWorkflow(
	'update-order-in-veeqo-workflow',
	(order_id: string) => {
		const order = getOrderDetailsStep(order_id) as any
		const veeqoOrder = updateOrderInVeeqoStep(order)
		return new WorkflowResponse(veeqoOrder)
	}
)

// SYNC -------------------------------------------------------------

export const addOrUpdateOrderInVeeqoStep = createStep(
	'add-or-update-order-in-veeqo-step',
	async (order: any, { container }) => {
		const veeqoOrderId = order.veeqo_order?.veeqo_order_id

		if (!veeqoOrderId) {
			// if order is not linked to a Veeqo order, nothing to do. order must be added explicitly to prevent duplicates
			return new StepResponse(void 0)
		}

		// fetch the updated Veeqo order details to check for changes that should trigger updates in Medusa, such as shipments created or updated in Veeqo
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoOrder = (await veeqoService.fetchOrder(veeqoOrderId)) as VeeqoOrderDTO

		// Sync shipment and delivery status changes from Veeqo to Medusa
		const [dbOrder] = await veeqoService.listVeeqoOrders({ order_id: order.id })
		if (dbOrder) {
			await syncVeeqoOrderShipmentsWorkflow(container)
				.run({
					input: { veeqoOrderDbId: dbOrder.id as string }
				})
				.catch((err: Error) =>
					container
						.resolve('logger')
						.warn(
							`veeqo: failed to sync shipment status for order ${order.id}: ${err.message}`
						)
				)
		}

		return new StepResponse(veeqoOrder)
	}
)

export const syncOrderToVeeqoWorkflow = createWorkflow(
	'sync-order-to-veeqo-workflow',
	(order_id: string) => {
		const order = getOrderDetailsStep(order_id)
		const veeqoCustomer = syncCustomerToVeeqoWorkflow.runAsStep({
			input: transform(order, o => o.customer!.id)
		})
		const stepInput = transform({ order, veeqoCustomer }, ({ order, veeqoCustomer }) => ({
			order,
			veeqo_customer_id: (veeqoCustomer as any)?.id as number
		}))
		const veeqoOrder = addOrderToVeeqoStep(stepInput)
		return new WorkflowResponse(veeqoOrder)
	}
)

// DELETE -----------------------------------------------------------

export const findAndDeleteOrderFromVeeqoStep = createStep(
	'find-and-delete-order-from-veeqo-step',
	async (order_id: string, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		await veeqoService.deleteOrder(order_id)
		return new StepResponse(void 0)
	}
)

const deleteOrderFromVeeqoWorkflow = createWorkflow(
	'delete-order-from-veeqo-workflow',
	(order_id: string) => {
		const result = findAndDeleteOrderFromVeeqoStep(order_id)
		return new WorkflowResponse(result)
	}
)

// private getBillingAddress(order: Order): VeeqoAddress | undefined {
// 	if (!order.billingAddress || !order.billingAddress.streetLine1) {
// 		order.billingAddress = order.shippingAddress
// 	}
// 	const { billingAddress } = order
// 	return {
// 		first_name: order.customer!.firstName,
// 		last_name: order.customer!.lastName,
// 		email: order.customer!.emailAddress,
// 		address1: billingAddress.streetLine1!,
// 		address2: billingAddress.streetLine2,
// 		city: billingAddress.city!,
// 		state: billingAddress.province!,
// 		country: billingAddress.countryCode!,
// 		zip: billingAddress.postalCode!,
// 		phone: billingAddress.phoneNumber
// 	}
// }

// private getShippingAddress(order: Order): VeeqoAddress {
// 	const { shippingAddress } = order
// 	const [firstName, ...rest] = shippingAddress.fullName
// 		? shippingAddress.fullName.split(' ')
// 		: [order.customer!.firstName, order.customer!.lastName]
// 	const lastName = rest.join(' ')
// 	return {
// 		first_name: firstName,
// 		last_name: lastName,
// 		email: order.customer!.emailAddress,
// 		address1: shippingAddress.streetLine1!,
// 		address2: order.shippingAddress.streetLine2,
// 		city: order.shippingAddress.city!,
// 		state: order.shippingAddress.province!,
// 		country: order.shippingAddress.countryCode!,
// 		zip: order.shippingAddress.postalCode!,
// 		phone: order.shippingAddress.phoneNumber
// 	}
// }
