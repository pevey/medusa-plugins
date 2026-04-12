import {
	createStep,
	createWorkflow,
	StepResponse,
	transform,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
	createOrderFulfillmentWorkflow,
	createOrderShipmentWorkflow,
	markFulfillmentAsDeliveredWorkflow,
	completeOrderWorkflow
} from '@medusajs/medusa/core-flows'
import { VeeqoService } from '../../modules/veeqo/service'
import { VeeqoOrderDTO } from '../../modules/veeqo/types'
import { Status } from '../../modules/veeqo/models/veeqo-order'

type SyncInput = {
	veeqoOrderDbId: string
}

type SyncData = {
	dbOrder: any // VeeqoOrder DB record
	liveOrder: VeeqoOrderDTO
}

// ─── Step 1: Fetch data ────────────────────────────────────────────────────────

const fetchVeeqoOrderDataStep = createStep(
	'fetch-veeqo-order-data-step',
	async (input: SyncInput, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const [dbOrder] = await veeqoService.listVeeqoOrders(
			{ id: input.veeqoOrderDbId },
			{ relations: ['veeqo_shipments'] }
		)

		if (!dbOrder) {
			throw new Error(`VeeqoOrder with id ${input.veeqoOrderDbId} not found`)
		}
		const liveOrder = await veeqoService.fetchOrder(dbOrder.veeqo_order_id)
		return new StepResponse({ dbOrder, liveOrder } as SyncData)
	}
)

// ─── Step 2: Process new shipments ────────────────────────────────────────────

const processNewShipmentsStep = createStep(
	'process-new-veeqo-shipments-step',
	async (data: SyncData, { container }) => {
		const { dbOrder, liveOrder } = data
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const existingAllocationIds = new Set<number>(
			((dbOrder.veeqo_shipments ?? []) as any[]).map((s: any) => s.veeqo_allocation_id)
		)

		const newAllocations = ((liveOrder.allocations ?? []) as any[]).filter(
			(alloc: any) => alloc.shipment != null && !existingAllocationIds.has(alloc.id)
		)

		if (!newAllocations.length) {
			return new StepResponse(void 0)
		}

		// Fetch order items once for all new shipments
		const { data: orders } = await query.graph({
			entity: 'order',
			fields: ['id', 'items.id', 'items.detail.quantity'],
			filters: { id: dbOrder.order_id }
		})
		const order = (orders[0] as any) ?? {}
		const items = ((order.items ?? []) as any[]).map((item: any) => ({
			id: item.id,
			quantity: (item.detail as any)?.quantity ?? item.quantity ?? 1
		}))

		for (const alloc of newAllocations as any[]) {
			const shipment = alloc.shipment as any

			// Create fulfillment linked to the order
			const { result: fulfillment } = await createOrderFulfillmentWorkflow(container).run({
				input: { order_id: dbOrder.order_id as string, items }
			})

			// Build labels from Veeqo tracking data when available
			const trackingNumber = shipment.tracking_number as any
			const labels = trackingNumber?.tracking_number
				? [
						{
							tracking_number: trackingNumber.tracking_number as string,
							tracking_url: (trackingNumber.tracking_url as string | null) ?? '',
							label_url: ''
						}
					]
				: []

			// Mark as shipped — emits shipment.created
			await createOrderShipmentWorkflow(container).run({
				input: {
					order_id: dbOrder.order_id as string,
					fulfillment_id: fulfillment.id,
					items,
					...(labels.length ? { labels } : {})
				}
			})

			// Persist VeeqoShipment record
			await veeqoService.createVeeqoShipments({
				veeqo_order_id: dbOrder.id as string,
				fulfillment_id: fulfillment.id,
				veeqo_allocation_id: alloc.id as number,
				veeqo_shipment_id: shipment.id as number,
				carrier: shipment.carrier ?? null,
				tracking_number: shipment.tracking_number ?? null,
				shipped_by: shipment.shipped_by ?? null,
				shipped_at: shipment.created_at ? new Date(shipment.created_at as string) : null
			} as any)
		}

		return new StepResponse(void 0)
	}
)

// ─── Step 2b: Complete order if shipped ──────────────────────────────────────

const completeOrderIfShippedStep = createStep(
	'complete-order-if-shipped-step',
	async (data: SyncData, { container }) => {
		const { dbOrder } = data
		const veeqoService: VeeqoService = container.resolve('veeqo')

		const shipments = await veeqoService.listVeeqoShipments({
			veeqo_order_id: dbOrder.id as string
		})

		if (shipments.length === 0) {
			return new StepResponse(void 0)
		}

		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const {
			data: [order]
		} = await query.graph({
			entity: 'order',
			fields: ['id', 'status'],
			filters: { id: dbOrder.order_id }
		})

		if ((order as any)?.status === 'pending') {
			await completeOrderWorkflow(container).run({
				input: { orderIds: [dbOrder.order_id as string] }
			})
		}

		return new StepResponse(void 0)
	}
)

// ─── Step 3: Process delivered shipments ──────────────────────────────────────

const processDeliveredShipmentsStep = createStep(
	'process-delivered-veeqo-shipments-step',
	async (data: SyncData, { container }) => {
		const { dbOrder } = data
		const veeqoService: VeeqoService = container.resolve('veeqo')

		// Re-query to include any shipments added in the previous step
		const currentShipments = (await veeqoService.listVeeqoShipments({
			veeqo_order_id: dbOrder.id as string
		})) as any[]

		const undelivered = currentShipments.filter((s: any) => s.veeqo_tracking_events == null)

		for (const dbShipment of undelivered) {
			const liveShipment = await veeqoService.fetchShipment(
				dbShipment.veeqo_shipment_id as number
			)

			if (!liveShipment.tracking_number?.delivered_at) continue

			const events = await veeqoService.fetchTrackingEvents(
				dbShipment.veeqo_shipment_id as number
			)

			await markFulfillmentAsDeliveredWorkflow(container).run({
				input: { id: dbShipment.fulfillment_id as string }
			})

			await veeqoService.updateVeeqoShipments({
				id: dbShipment.id as string,
				veeqo_tracking_events: events as any
			})
		}

		return new StepResponse(void 0)
	}
)

// ─── Step 4: Finalize ─────────────────────────────────────────────────────────

const finalizeVeeqoOrderSyncStep = createStep(
	'finalize-veeqo-order-sync-step',
	async (data: SyncData, { container }) => {
		const { dbOrder } = data
		const veeqoService: VeeqoService = container.resolve('veeqo')

		const currentShipments = (await veeqoService.listVeeqoShipments({
			veeqo_order_id: dbOrder.id as string
		})) as any[]

		const allDelivered =
			currentShipments.length > 0 &&
			currentShipments.every((s: any) => s.veeqo_tracking_events != null)

		await veeqoService.updateVeeqoOrders({
			id: dbOrder.id as string,
			last_synced_at: new Date(),
			...(allDelivered ? { status: Status.CLOSED } : {})
		})

		return new StepResponse(void 0)
	}
)

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const syncVeeqoOrderShipmentsWorkflow = createWorkflow(
	'sync-veeqo-order-shipments-workflow',
	function (input: SyncInput) {
		const data = fetchVeeqoOrderDataStep(input)

		// Steps must run sequentially: chain via transform to enforce ordering.
		const _step2 = processNewShipmentsStep(data)
		const step2bInput = transform({ data, _step2 }, ({ data }) => data)

		const _step2b = completeOrderIfShippedStep(step2bInput)
		const step3Input = transform({ data, _step2b }, ({ data }) => data)

		const _step3 = processDeliveredShipmentsStep(step3Input)
		const step4Input = transform({ data, _step3 }, ({ data }) => data)

		finalizeVeeqoOrderSyncStep(step4Input)

		return new WorkflowResponse(void 0)
	}
)
