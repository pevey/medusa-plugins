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
} from '../modules/veeqo/types'
import { VeeqoService } from '../modules/veeqo/service'
import { SourceType } from '../modules/veeqo/models/veeqo-order'
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

// ─── Replacement context types and mapper ───────────────────────────────────

type ReplacementItem = {
	id: string
	quantity: number
	variant_id: string | null
	unit_price: number
}

type ReplacementContext = {
	order_id: string
	source_type: SourceType
	source_id: string
	additional_items: ReplacementItem[]
	customer: { id: string; email: string | null; phone: string | null } | null
	shipping_address: any
	sales_channel: { id: string; veeqo_channel_id?: number | null } | null
	shipping_method: { id: string; veeqo_delivery_method_id?: number | null } | null
	parent_veeqo_order_id: number | null
	variants_with_sellable: Record<string, { veeqo_sellable_id: number | string | undefined }>
}

// Disambiguator pattern. Stays short and human-readable for warehouse-staff search in Veeqo.
// If Veeqo rejects this format due to length or special characters, swap to a shorter
// fallback (truncate source_id, switch # to --, etc.) — see the design doc Section 6.
const buildVeeqoOrderNumber = (
	sourceType: SourceType,
	orderId: string,
	sourceId: string
): string => {
	switch (sourceType) {
		case SourceType.ORDER_PLACED:
			return orderId
		case SourceType.CLAIM:
			return `${orderId}#claim-${sourceId}`
		case SourceType.EXCHANGE:
			return `${orderId}#exchange-${sourceId}`
	}
}

const mapReplacementContextToVeeqoOrderInput = (
	ctx: ReplacementContext,
	veeqoCustomerId: number
): VeeqoOrderInput | null => {
	// Refund-only claims (and any other "nothing to ship") return null as a sentinel.
	// createVeeqoOrderStep recognizes this and short-circuits without writing a row.
	if (!ctx.additional_items.length) {
		return null
	}

	const missingFields: string[] = []
	if (!ctx.sales_channel?.veeqo_channel_id) missingFields.push('sales_channel.veeqo_channel_id')
	if (!ctx.shipping_method?.veeqo_delivery_method_id)
		missingFields.push('shipping_method.veeqo_delivery_method_id')

	const itemsMissingSellable = ctx.additional_items.filter(
		item => !item.variant_id || !ctx.variants_with_sellable[item.variant_id]?.veeqo_sellable_id
	)
	if (itemsMissingSellable.length) {
		missingFields.push(
			`additional_items[${itemsMissingSellable.map(i => i.id).join(', ')}].variant.veeqo_sellable_id`
		)
	}

	if (missingFields.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Replacement for ${ctx.source_type} ${ctx.source_id} is missing required fields: ${missingFields.join(', ')}`
		)
	}

	const number = buildVeeqoOrderNumber(ctx.source_type, ctx.order_id, ctx.source_id)

	const noteText = ctx.parent_veeqo_order_id
		? `Replacement for Veeqo order #${ctx.parent_veeqo_order_id}. Medusa ${ctx.source_type}: ${ctx.source_id}.`
		: `Medusa ${ctx.source_type}: ${ctx.source_id}. (Parent Veeqo order not found.)`

	const addr = ctx.shipping_address ?? {}
	const deliverTo: VeeqoAddress = {
		first_name: addr.first_name ?? '',
		last_name: addr.last_name ?? '',
		email: ctx.customer?.email ?? '',
		address1: addr.address_1 ?? '',
		...(addr.address_2 ? { address2: addr.address_2 } : {}),
		city: addr.city ?? '',
		state: (addr.province as string | undefined)?.toUpperCase() ?? '',
		country: (addr.country_code as string | undefined)?.toUpperCase() ?? '',
		zip: (addr.postal_code as string | undefined)?.toUpperCase() ?? '',
		...(addr.phone ? { phone: addr.phone } : {})
	}

	return {
		channel_id: ctx.sales_channel!.veeqo_channel_id!,
		customer_id: veeqoCustomerId,
		deliver_to_attributes: deliverTo,
		delivery_method_id: ctx.shipping_method!.veeqo_delivery_method_id!,
		number,
		send_notification_email: false,
		// total_discounts is required by Veeqo despite the optional TS marker.
		total_discounts: 0,
		line_items_attributes: ctx.additional_items.map(item => ({
			sellable_id: Number(ctx.variants_with_sellable[item.variant_id!]!.veeqo_sellable_id),
			price_per_unit: item.unit_price,
			quantity: item.quantity
		})),
		payment_attributes: {
			payment_type: 'manual',
			reference_number: number
		},
		employee_notes_attributes: [{ text: noteText }]
	}
}

// ─── Steps ────────────────────────────────────────────────────────────────────

/**
 * Looks up a VeeqoOrder row by its (source_type, source_id) key.
 *
 * Used as the idempotency primitive for both the original-order and replacement flows.
 * Returns the row if it exists, null otherwise. Note: a returned row may have
 * veeqo_order_id=NULL (placeholder from a failed prior create attempt) — callers
 * decide whether to retry or skip based on that.
 */
export const findVeeqoOrderBySourceStep = createStep(
	'find-veeqo-order-by-source',
	async (
		input: { source_type: SourceType; source_id: string },
		{ container }
	) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const [existing] = await veeqoService.listVeeqoOrders({
			source_type: input.source_type,
			source_id: input.source_id
		})
		return new StepResponse(existing ?? null)
	}
)

/**
 * Creates a Veeqo order via the API and persists the corresponding VeeqoOrder row.
 *
 * Uses the placeholder-row pattern for failure visibility:
 * 1. Insert/update a row marking the attempt (veeqo_order_id=NULL initially).
 * 2. Call Veeqo API.
 * 3. On success: update the row with veeqo_order_id, clear last_sync_error.
 * 4. On retryable failure: persist last_sync_error, throw so subscriber retries.
 * 5. On non-retryable failure: persist last_sync_error, return null (no retry).
 *
 * If the input.veeqo_input is null (sentinel from the replacement mapper for refund-only
 * claims), this step is a clean no-op — no row, no API call.
 */
export const createVeeqoOrderStep = createStep(
	'create-veeqo-order',
	async (
		input: {
			order_id: string
			source_type: SourceType
			source_id: string
			veeqo_input: VeeqoOrderInput | null
		},
		{ container }
	) => {
		const logger = container.resolve('logger')

		// Refund-only claims (and any other "nothing to ship" sentinel) come through with
		// null veeqo_input. Skip cleanly without writing a placeholder row or hitting the API.
		if (input.veeqo_input == null) {
			logger.info(
				`veeqo: skipping ${input.source_type} ${input.source_id} — no items to ship`
			)
			return new StepResponse(null)
		}

		const veeqoService: VeeqoService = container.resolve('veeqo')

		// Resolve the local VeeqoCustomer DB id (needed as FK on VeeqoOrder rows).
		const dbCustomers = await veeqoService.listVeeqoCustomers(
			{ veeqo_customer_id: input.veeqo_input.customer_id },
			{ take: 1 }
		)
		const veeqoCustomerDbId = (dbCustomers[0] as any)?.id as string | undefined

		// Find or create the placeholder row.
		const [existing] = await veeqoService.listVeeqoOrders({
			source_type: input.source_type,
			source_id: input.source_id
		})

		// Idempotency: if a healthy row already exists (veeqo_order_id set, no error),
		// this is a true no-op. Don't call the Veeqo API — that would create a duplicate.
		if (existing && (existing as any).veeqo_order_id != null && (existing as any).last_sync_error == null) {
			logger.info(
				`veeqo: ${input.source_type} ${input.source_id} already synced (veeqo_order_id=${(existing as any).veeqo_order_id})`
			)
			return new StepResponse(null)
		}

		let rowId: string
		if (existing) {
			// Previous attempt — update the timestamp and clear any prior error before retrying.
			await veeqoService.updateVeeqoOrders({
				selector: { id: (existing as any).id },
				data: {
					last_sync_attempted_at: new Date(),
					last_sync_error: null
				}
			})
			rowId = (existing as any).id
		} else {
			const created = (await veeqoService.createVeeqoOrders([
				{
					order_id: input.order_id,
					source_type: input.source_type,
					source_id: input.source_id,
					veeqo_order_id: null,
					last_sync_attempted_at: new Date(),
					...(veeqoCustomerDbId ? { veeqo_customer_id: veeqoCustomerDbId } : {})
				} as any
			])) as any
			rowId = Array.isArray(created) ? created[0].id : created.id
		}

		try {
			// Pre-flight duplicate prevention: a previous attempt's API call may have succeeded
			// even though our DB write failed (leaving us with a placeholder row but a real
			// Veeqo order with this `number` already in existence). Search Veeqo by number
			// before posting; if found, adopt it instead of creating a duplicate.
			//
			// The disambiguated `number` is unique enough that the free-text `query` parameter
			// reliably surfaces only the exact order we care about. We still client-side
			// exact-match in findOrderByNumber as a safety net.
			const orphan = await veeqoService.findOrderByNumber(input.veeqo_input.number).catch(() => null)
			if (orphan?.id) {
				logger.info(
					`veeqo: recovered orphaned Veeqo order ${orphan.id} for ${input.source_type} ${input.source_id} (number: ${input.veeqo_input.number})`
				)
				await veeqoService.updateVeeqoOrders({
					selector: { id: rowId },
					data: { veeqo_order_id: orphan.id, last_sync_error: null }
				})
				return new StepResponse(orphan)
			}

			const apiResponse = await veeqoService.addOrder({ veeqo_input: input.veeqo_input })
			if (!apiResponse?.id) {
				throw new MedusaError(
					MedusaError.Types.UNEXPECTED_STATE,
					`Veeqo addOrder returned no id for ${input.source_type} ${input.source_id}`
				)
			}

			// Success: write the real Veeqo id back to the row, clear error.
			await veeqoService.updateVeeqoOrders({
				selector: { id: rowId },
				data: {
					veeqo_order_id: apiResponse.id,
					last_sync_error: null
					// last_sync_attempted_at intentionally retained at the placeholder write timestamp
				}
			})

			return new StepResponse(apiResponse)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			logger.warn(
				`veeqo: failed to sync ${input.source_type} ${input.source_id} (medusa order ${input.order_id}): ${message}`
			)

			// Persist the error on the placeholder row.
			await veeqoService.updateVeeqoOrders({
				selector: { id: rowId },
				data: {
					last_sync_error: message,
					last_sync_attempted_at: new Date()
				}
			})

			if (isNonRetryableVeeqoError(err)) {
				// Return success so subscriber doesn't keep retrying a request that will never succeed.
				return new StepResponse(null)
			}
			// Retryable: rethrow and let Medusa's subscriber retry mechanism handle it.
			throw err
		}
	}
)

/**
 * Classifies whether an error from Veeqo's API is worth retrying.
 *
 * Non-retryable: validation errors (400/422), missing data (INVALID_DATA) — retrying with
 * the same input will produce the same error.
 * Retryable: network failures, 5xx, rate-limit (429) — transient by nature.
 */
function isNonRetryableVeeqoError(err: unknown): boolean {
	if (err instanceof MedusaError && err.type === MedusaError.Types.INVALID_DATA) {
		return true
	}
	const message = err instanceof Error ? err.message.toLowerCase() : ''
	if (message.includes('400') || message.includes('422')) return true
	return false
}

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

		// Resolve all cross-module links in parallel.
		// (Note: veeqo_order lookups have moved out of this step. The placement-flow
		// idempotency check now happens at the workflow level via findVeeqoOrderBySourceStep.)
		const [
			{ data: customers },
			{ data: salesChannels },
			variantMap,
			shippingOptionMap
		] = await Promise.all([
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
			})
		}

		return new StepResponse(result)
	}
)

export const processVeeqoStatusChangesStep = createStep(
	'process-veeqo-status-changes-step',
	async (data: { order: OrderForVeeqoOrderInput; veeqo_order: VeeqoOrderDTO }, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		// Scoped to ORDER_PLACED — this step is in the original-order flow.
		const [dbOrder] = await veeqoService.listVeeqoOrders({
			order_id: data.order.id,
			source_type: SourceType.ORDER_PLACED
		})
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
	async (
		input: { source_type: SourceType; source_id: string },
		{ container }
	) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const [veeqoOrderRow] = await veeqoService.listVeeqoOrders({
			source_type: input.source_type,
			source_id: input.source_id
		})
		const veeqoOrderId = (veeqoOrderRow as any)?.veeqo_order_id
		if (!veeqoOrderId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo order found for ${input.source_type} ${input.source_id}`
			)
		}
		const veeqoOrder = (await veeqoService.fetchOrder(veeqoOrderId)) as VeeqoOrderDTO
		return new StepResponse(veeqoOrder)
	}
)

export const getVeeqoOrderWorkflow = createWorkflow(
	'get-veeqo-order-workflow',
	(input: { source_type: SourceType; source_id: string }) => {
		const veeqoOrder = fetchOrderFromVeeqoStep(input)
		return new WorkflowResponse(veeqoOrder)
	}
)

// ADD -----------------------------------------------------------

// addOrderToVeeqoStep removed in v0.3.0 — its logic is now subsumed by createVeeqoOrderStep
// (which handles idempotency, the placeholder-row pattern, and post-success persistence).

export const addOrderToVeeqoWorkflow = createWorkflow(
	'add-order-to-veeqo-workflow',
	(order_id: string) => {
		const order = getOrderDetailsStep(order_id)

		const veeqoCustomer = syncCustomerToVeeqoWorkflow.runAsStep({
			input: transform(order, o => o.customer!.id)
		})

		const veeqoInput = transform(
			{ order, veeqoCustomer },
			({ order, veeqoCustomer }) =>
				mapOrderToVeeqoOrderInput(order, (veeqoCustomer as any)?.id as number)
		)

		const veeqoOrder = createVeeqoOrderStep(
			transform({ order, veeqoInput }, ({ order, veeqoInput }) => ({
				order_id: order.id,
				source_type: SourceType.ORDER_PLACED,
				source_id: order.id,
				veeqo_input: veeqoInput
			}))
		)

		return new WorkflowResponse(veeqoOrder)
	}
)

// UPDATE -----------------------------------------------------------

export const updateOrderInVeeqoStep = createStep(
	'update-order-in-veeqo-step',
	async (
		input: { source_type: SourceType; source_id: string },
		{ container }
	) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const [existing] = await veeqoService.listVeeqoOrders({
			source_type: input.source_type,
			source_id: input.source_id
		})
		const veeqoOrderId = (existing as any)?.veeqo_order_id
		if (!veeqoOrderId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo order found for ${input.source_type} ${input.source_id}`
			)
		}
		const veeqoOrderInput = {} as VeeqoOrderInput
		const veeqoOrder = await veeqoService.updateOrder(veeqoOrderId, veeqoOrderInput)
		return new StepResponse(veeqoOrder)
	}
)

export const updateOrderInVeeqoWorkflow = createWorkflow(
	'update-order-in-veeqo-workflow',
	(input: { source_type: SourceType; source_id: string }) => {
		const veeqoOrder = updateOrderInVeeqoStep(input)
		return new WorkflowResponse(veeqoOrder)
	}
)

// SYNC -------------------------------------------------------------

/**
 * Step that handles the existing-order side of syncOrderToVeeqoWorkflow:
 * fetches the latest Veeqo state and triggers shipment sync.
 *
 * The "create new Veeqo order" branch is now delegated to createVeeqoOrderStep
 * at the workflow level — see syncOrderToVeeqoWorkflow below.
 */
export const refreshExistingPlacedVeeqoOrderStep = createStep(
	'refresh-existing-placed-veeqo-order-step',
	async (
		input: { order_id: string },
		{ container }
	) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const [dbOrder] = await veeqoService.listVeeqoOrders({
			order_id: input.order_id,
			source_type: SourceType.ORDER_PLACED
		})

		// No row, or placeholder row from a still-in-flight create — nothing to refresh.
		if (!dbOrder || (dbOrder as any).veeqo_order_id == null) {
			return new StepResponse(null)
		}

		const veeqoOrder = (await veeqoService.fetchOrder(
			(dbOrder as any).veeqo_order_id
		)) as VeeqoOrderDTO

		await syncVeeqoOrderShipmentsWorkflow(container)
			.run({
				input: { veeqoOrderDbId: (dbOrder as any).id as string }
			})
			.catch((err: Error) =>
				container
					.resolve('logger')
					.warn(
						`veeqo: failed to sync shipment status for order ${input.order_id}: ${err.message}`
					)
			)

		return new StepResponse(veeqoOrder)
	}
)

/**
 * Idempotency check for the placement flow. If a healthy ORDER_PLACED VeeqoOrder
 * already exists, syncOrderToVeeqoWorkflow takes the refresh path; otherwise it
 * takes the create path via createVeeqoOrderStep.
 *
 * This step's role is purely to read and report; the conditional execution
 * happens via createVeeqoOrderStep's own existence check.
 */
export const syncOrderToVeeqoWorkflow = createWorkflow(
	'sync-order-to-veeqo-workflow',
	(order_id: string) => {
		const order = getOrderDetailsStep(order_id)

		const veeqoCustomer = syncCustomerToVeeqoWorkflow.runAsStep({
			input: transform(order, o => o.customer!.id)
		})

		// Build the Veeqo input even if the row already exists — createVeeqoOrderStep
		// will short-circuit if a healthy row is already present (idempotency check).
		const veeqoInput = transform(
			{ order, veeqoCustomer },
			({ order, veeqoCustomer }) =>
				mapOrderToVeeqoOrderInput(order, (veeqoCustomer as any)?.id as number)
		)

		// Create-or-skip via the placeholder-row pattern.
		createVeeqoOrderStep(
			transform({ order, veeqoInput }, ({ order, veeqoInput }) => ({
				order_id: order.id,
				source_type: SourceType.ORDER_PLACED,
				source_id: order.id,
				veeqo_input: veeqoInput
			}))
		)

		// Refresh shipment state from Veeqo if the row already existed and is healthy.
		// (This is a no-op for a freshly-created row since shipments take time to materialize
		// in Veeqo after creation.)
		const refreshed = refreshExistingPlacedVeeqoOrderStep(
			transform(order, o => ({ order_id: o.id }))
		)

		return new WorkflowResponse(refreshed)
	}
)

// ─── Replacement Sync (claims & exchanges) ──────────────────────────

/**
 * Fetches everything needed to construct a Veeqo order for a claim or exchange:
 * - the claim/exchange's additional_items (the outbound items being shipped to the customer)
 * - the parent order's customer, shipping address, sales channel, shipping method
 * - the parent VeeqoOrder's veeqo_order_id (for the "Replacement for #N" note)
 *
 * Returns a ReplacementContext shape consumed by mapReplacementContextToVeeqoOrderInput.
 */
export const getReplacementContextStep = createStep(
	'get-replacement-context-step',
	async (
		input: { order_id: string; source_type: SourceType; source_id: string },
		{ container }
	) => {
		const query = container.resolve('query')

		// 1. Fetch the claim or exchange + its additional_items (line items to ship)
		const sourceEntity =
			input.source_type === SourceType.CLAIM ? 'order_claim' : 'order_exchange'

		const { data: sourceRows } = await query.graph({
			entity: sourceEntity,
			fields: [
				'id',
				'additional_items.id',
				'additional_items.quantity',
				'additional_items.item.id',
				'additional_items.item.unit_price',
				'additional_items.item.variant_id'
			],
			filters: { id: input.source_id }
		})

		const sourceRow = (sourceRows as any[])[0]
		if (!sourceRow) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`${input.source_type} ${input.source_id} not found`
			)
		}

		const additionalItems: ReplacementItem[] = ((sourceRow.additional_items ?? []) as any[]).map(
			ci => ({
				id: ci.id as string,
				quantity: Number(ci.quantity),
				variant_id: (ci.item?.variant_id as string | null | undefined) ?? null,
				unit_price: Number(ci.item?.unit_price ?? 0)
			})
		)

		// 2. Fetch the parent order context
		const { data: orderRows } = await query.graph({
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
				'shipping_methods.id',
				'shipping_methods.shipping_option_id'
			],
			filters: { id: input.order_id }
		})

		const orderRow = (orderRows as any[])[0]
		if (!orderRow) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Order ${input.order_id} not found for ${input.source_type} ${input.source_id}`
			)
		}

		// 3. Fetch cross-module data in parallel
		const variantIds = additionalItems
			.map(i => i.variant_id)
			.filter((v): v is string => Boolean(v))
		const shippingOptionIds = ((orderRow.shipping_methods ?? []) as any[])
			.map(sm => sm.shipping_option_id as string)
			.filter(Boolean)

		const [
			parentVeeqoRows,
			customerRes,
			salesChannelRes,
			variantsWithSellable,
			shippingOptionRes
		] = await Promise.all([
			query.graph({
				entity: 'veeqo_order',
				fields: ['veeqo_order_id'],
				filters: {
					order_id: input.order_id,
					source_type: SourceType.ORDER_PLACED
				}
			}),
			orderRow.customer_id
				? query.graph({
						entity: 'customer',
						fields: ['id', 'email', 'phone'],
						filters: { id: orderRow.customer_id }
					})
				: Promise.resolve({ data: [] as any[] }),
			orderRow.sales_channel_id
				? query.graph({
						entity: 'sales_channel',
						fields: ['id', 'veeqo_channel.veeqo_channel_id'],
						filters: { id: orderRow.sales_channel_id }
					})
				: Promise.resolve({ data: [] as any[] }),
			variantIds.length > 0
				? query
						.graph({
							entity: 'product_variant',
							fields: ['id', 'veeqo_sellable.veeqo_sellable_id'],
							filters: { id: variantIds }
						})
						.then(({ data }) =>
							Object.fromEntries(
								(data as any[]).map(v => [
									v.id,
									{ veeqo_sellable_id: v.veeqo_sellable?.veeqo_sellable_id }
								])
							)
						)
				: Promise.resolve({} as Record<string, { veeqo_sellable_id: number | string | undefined }>),
			shippingOptionIds.length > 0
				? query.graph({
						entity: 'shipping_option',
						fields: ['id', 'veeqo_delivery_method.veeqo_delivery_method_id'],
						filters: { id: shippingOptionIds }
					})
				: Promise.resolve({ data: [] as any[] })
		])

		const customer = (customerRes.data as any[])[0]
		const salesChannel = (salesChannelRes.data as any[])[0]
		const parentVeeqo = (parentVeeqoRows.data as any[])[0]
		const shippingOption = (shippingOptionRes.data as any[])[0]

		const result: ReplacementContext = {
			order_id: input.order_id,
			source_type: input.source_type,
			source_id: input.source_id,
			additional_items: additionalItems,
			customer: customer
				? { id: customer.id, email: customer.email ?? null, phone: customer.phone ?? null }
				: null,
			shipping_address: orderRow.shipping_address,
			sales_channel: salesChannel
				? {
						id: salesChannel.id,
						veeqo_channel_id: salesChannel.veeqo_channel?.veeqo_channel_id
					}
				: null,
			shipping_method: shippingOption
				? {
						id: shippingOption.id,
						veeqo_delivery_method_id:
							shippingOption.veeqo_delivery_method?.veeqo_delivery_method_id
					}
				: null,
			parent_veeqo_order_id: parentVeeqo?.veeqo_order_id ?? null,
			variants_with_sellable: variantsWithSellable
		}

		return new StepResponse(result)
	}
)

/**
 * Top-level workflow for syncing a claim or exchange's outbound shipment to Veeqo.
 *
 * Flow:
 *   1. Fetch replacement context (claim/exchange items + parent order context).
 *   2. Sync the customer to Veeqo (existing reused workflow).
 *   3. Build the VeeqoOrderInput from context. Returns null sentinel for refund-only claims.
 *   4. Call createVeeqoOrderStep, which handles the placeholder-row pattern, idempotency,
 *      Veeqo API call, and post-success row update.
 */
export const syncReplacementToVeeqoWorkflow = createWorkflow(
	'sync-replacement-to-veeqo-workflow',
	(input: { orderId: string; sourceType: SourceType; sourceId: string }) => {
		const ctx = getReplacementContextStep(
			transform(input, i => ({
				order_id: i.orderId,
				source_type: i.sourceType,
				source_id: i.sourceId
			}))
		)

		const veeqoCustomer = syncCustomerToVeeqoWorkflow.runAsStep({
			input: transform(ctx, c => c.customer!.id)
		})

		const veeqoInput = transform(
			{ ctx, veeqoCustomer },
			({ ctx, veeqoCustomer }) =>
				mapReplacementContextToVeeqoOrderInput(ctx, (veeqoCustomer as any)?.id as number)
		)

		const veeqoOrder = createVeeqoOrderStep(
			transform({ ctx, veeqoInput }, ({ ctx, veeqoInput }) => ({
				order_id: ctx.order_id,
				source_type: ctx.source_type,
				source_id: ctx.source_id,
				veeqo_input: veeqoInput
			}))
		)

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
