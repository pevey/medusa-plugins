// import { ExecArgs } from '@medusajs/framework/types'
// import { MILDRED_MODULE } from '../modules/analytics'
// import type { MildredService } from '../modules/analytics/service'

// // Real IDs from the database
// const CART_IDS = [
// 	'cart_01KNTQD4QGX0P054EQP2A89CSA',
// 	'cart_01KNT1Q5B0R4GMG48J8DR4FHWS',
// 	'cart_01KNSTNJ4PANTH67FTEA3PH0TQ',
// 	'cart_01KNST6RGP7PM0FH998N97SCBF',
// 	'cart_01KNR2YW4FCT7CEDH5XA4JA7SH',
// 	'cart_01KNN9ZEAV9NNPZTXBD2K9F2EQ',
// 	'cart_01KNK0F60B75V1A2MNQJQQTX7B',
// 	'cart_01KNK0AKC8VZ05NSW6PXVR72VV',
// 	'cart_01KNJZPYRZE4DMP0ANHP9S5X8J',
// 	'cart_01KNJYFKG934PM8E30PRWAFHEJ',
// 	'cart_01KNG62JGV19TPC53BPCJJST8V',
// 	'cart_01KNE842FEZSQGF7B0X8AHHZD3',
// 	'cart_01KNE78AXDPCT7D81A6X47V6NA',
// 	'cart_01KNE6YQVV9AJ8CAXA01WC9XN7',
// 	'cart_01KNE6FQZFFMKJHKG61283RCSY',
// 	'cart_01KNE5X9F3Y75RMMDE4PESN19C',
// 	'cart_01KMW7H4SZ44NBGHEG96ZSM1PF',
// 	'cart_01KMW5YJ06W0TJDE876CBP28DG',
// 	'cart_01KMW5WE8M9KK5EQXP6QTSS72W',
// 	'cart_01KMW5Q4RP1Q0MKMWBXF7K9D4M'
// ]

// const CUSTOMER_IDS = [
// 	'cus_01KG4E4E81BTZNX9Q4G3SJZY6B',
// 	'cus_01KG0TB01FQV0TE6ND2SB4HWF6'
// ]

// const ORDER_IDS = [
// 	'order_01KNR32FZ3WDAASEGQ284XC8HW',
// 	'order_01KNK0FNW98M3MVVRTGYQZ3V19',
// 	'order_01KNK0B173F1CJ56F5XFRDXKP3',
// 	'order_01KNJZQEBQT8KG49GNTHT08YS5',
// 	'order_01KNJYG18Z0EHXE6QK48FPQY1X',
// 	'order_01KNG6355HM646CS54ABC84DTX'
// ]

// const SALES_CHANNEL_ID = 'sc_01KF54B4KJY3YXY0584M3C84Y0'

// // Generate synthetic visitor/customer IDs to supplement real data
// const SYNTHETIC_CART_IDS = Array.from({ length: 80 }, (_, i) =>
// 	`cart_seed_${String(i + 1).padStart(3, '0')}`
// )
// const SYNTHETIC_CUSTOMER_IDS = Array.from({ length: 20 }, (_, i) =>
// 	`cus_seed_${String(i + 1).padStart(3, '0')}`
// )

// const ALL_CART_IDS = [...CART_IDS, ...SYNTHETIC_CART_IDS]
// const ALL_CUSTOMER_IDS = [...CUSTOMER_IDS, ...SYNTHETIC_CUSTOMER_IDS]

// function randomDate(daysBack: number): Date {
// 	const now = Date.now()
// 	return new Date(now - Math.random() * daysBack * 86400000)
// }

// function pick<T>(arr: T[]): T {
// 	return arr[Math.floor(Math.random() * arr.length)]
// }

// export default async function seedAnalytics({ container }: ExecArgs) {
// 	const logger = container.resolve('logger')
// 	const mildredService: MildredService = container.resolve(MILDRED_MODULE)

// 	// ── Create custom rubrics for storefront events ─────────────────────
// 	const customRubrics = [
// 		{ name: 'checkout_viewed', label: 'Checkout Viewed', description: 'Visitor navigated to checkout page', active: true },
// 		{ name: 'product_viewed', label: 'Product Viewed', description: 'Visitor viewed a product detail page', active: true }
// 	]

// 	for (const rubric of customRubrics) {
// 		const existing = await mildredService.listAnalyticsRubrics({ name: rubric.name })
// 		if (existing.length === 0) {
// 			await mildredService.createAnalyticsRubrics(rubric)
// 			logger.info(`seed-analytics: created rubric "${rubric.name}"`)
// 		}
// 	}

// 	// ── Simulate funnel events over the last 60 days ────────────────────
// 	// Funnel: cart_created → cart_updated → checkout_viewed → order_placed
// 	// Each cart starts at step 1, with dropout at each stage

// 	const events: Array<{
// 		event: string
// 		actor_id: string
// 		properties: Record<string, unknown> | null
// 		session_id: string | null
// 		source: 'storefront' | 'backend'
// 		sales_channel_id: string | null
// 		timestamp: Date
// 	}> = []

// 	// Pre-assign customers to carts that will convert (simulates post-stitching state)
// 	// In production, identity stitching backfills cart events with the customer_id
// 	let customerIndex = 0
// 	for (const cartId of ALL_CART_IDS) {
// 		const baseTime = randomDate(60)
// 		const sessionId = crypto.randomUUID()

// 		// Decide upfront if this visitor converts through the full funnel
// 		const doesUpdate = Math.random() < 0.85
// 		const doesCheckout = doesUpdate && Math.random() < 0.60
// 		const doesOrder = doesCheckout && Math.random() < 0.50

// 		// If this visitor orders, assign a customer and use it as actor_id for ALL events
// 		// This simulates the post-stitching state where cart events are backfilled
// 		const customerId = doesOrder ? ALL_CUSTOMER_IDS[customerIndex++ % ALL_CUSTOMER_IDS.length] : null
// 		const actorId = customerId ?? cartId

// 		// Step 1: cart_created (100% of carts)
// 		events.push({
// 			event: 'cart_created',
// 			actor_id: actorId,
// 			properties: { cart_id: cartId },
// 			session_id: sessionId,
// 			source: 'backend',
// 			sales_channel_id: SALES_CHANNEL_ID,
// 			timestamp: baseTime
// 		})

// 		// Step 2: cart_updated — 85% of carts add items
// 		if (doesUpdate) {
// 			const updateCount = Math.floor(Math.random() * 3) + 1
// 			for (let u = 0; u < updateCount; u++) {
// 				events.push({
// 					event: 'cart_updated',
// 					actor_id: actorId,
// 					properties: { cart_id: cartId, action: 'item_added' },
// 					session_id: sessionId,
// 					source: 'backend',
// 					sales_channel_id: SALES_CHANNEL_ID,
// 					timestamp: new Date(baseTime.getTime() + (u + 1) * 60000)
// 				})
// 			}

// 			// Step 3: checkout_viewed — 60% of those who updated visit checkout
// 			if (doesCheckout) {
// 				events.push({
// 					event: 'checkout_viewed',
// 					actor_id: actorId,
// 					properties: { page: '/checkout' },
// 					session_id: sessionId,
// 					source: 'storefront',
// 					sales_channel_id: SALES_CHANNEL_ID,
// 					timestamp: new Date(baseTime.getTime() + 300000)
// 				})

// 				// Step 4: order_placed — 50% of those who view checkout complete
// 				if (doesOrder) {
// 					const orderId = pick(ORDER_IDS)
// 					events.push({
// 						event: 'order_placed',
// 						actor_id: actorId,
// 						properties: {
// 							order_id: orderId,
// 							cart_id: cartId,
// 							total: Math.floor(Math.random() * 20000) / 100
// 						},
// 						session_id: null,
// 						source: 'backend',
// 						sales_channel_id: SALES_CHANNEL_ID,
// 						timestamp: new Date(baseTime.getTime() + 600000)
// 					})

// 					// Some completed orders
// 					if (Math.random() < 0.70) {
// 						events.push({
// 							event: 'order_completed',
// 							actor_id: actorId,
// 							properties: { order_id: orderId },
// 							session_id: null,
// 							source: 'backend',
// 							sales_channel_id: SALES_CHANNEL_ID,
// 							timestamp: new Date(baseTime.getTime() + 86400000 * 3)
// 						})
// 					}

// 					// Shipments
// 					if (Math.random() < 0.80) {
// 						events.push({
// 							event: 'shipment_created',
// 							actor_id: actorId,
// 							properties: { order_id: orderId },
// 							session_id: null,
// 							source: 'backend',
// 							sales_channel_id: SALES_CHANNEL_ID,
// 							timestamp: new Date(baseTime.getTime() + 86400000)
// 						})
// 					}
// 				}
// 			}
// 		}

// 		// Some extra product_viewed events from storefront
// 		const viewCount = Math.floor(Math.random() * 5) + 1
// 		for (let v = 0; v < viewCount; v++) {
// 			events.push({
// 				event: 'product_viewed',
// 				actor_id: actorId,
// 				properties: { product_id: `prod_${Math.random().toString(36).slice(2, 10)}` },
// 				session_id: sessionId,
// 				source: 'storefront',
// 				sales_channel_id: SALES_CHANNEL_ID,
// 				timestamp: new Date(baseTime.getTime() - (v + 1) * 30000)
// 			})
// 		}
// 	}

// 	// Add some customer_created events
// 	for (const customerId of ALL_CUSTOMER_IDS) {
// 		events.push({
// 			event: 'customer_created',
// 			actor_id: customerId,
// 			properties: { customer_id: customerId },
// 			session_id: null,
// 			source: 'backend',
// 			sales_channel_id: null,
// 			timestamp: randomDate(90)
// 		})
// 	}

// 	// Batch insert all events
// 	logger.info(`seed-analytics: inserting ${events.length} events...`)
// 	await mildredService.trackEvent(events.map(e => ({
// 		event: e.event,
// 		actor_id: e.actor_id,
// 		properties: e.properties,
// 		session_id: e.session_id,
// 		source: e.source,
// 		sales_channel_id: e.sales_channel_id
// 	})))

// 	// Fix timestamps (trackEvent sets timestamp to now(), so overwrite via raw SQL)
// 	const manager = (mildredService as any).__container__?.manager
// 	if (manager) {
// 		const knex = manager.getKnex()
// 		const dbEvents = await knex('analytics_event')
// 			.select('id', 'event', 'actor_id')
// 			.orderBy('created_at', 'desc')
// 			.limit(events.length)

// 		// Match by event+actor_id and update timestamps
// 		for (let i = 0; i < Math.min(dbEvents.length, events.length); i++) {
// 			await knex('analytics_event')
// 				.where('id', dbEvents[i].id)
// 				.update({ timestamp: events[events.length - 1 - i].timestamp })
// 		}
// 		logger.info('seed-analytics: timestamps backdated')
// 	}

// 	// ── Create identities for stitching ─────────────────────────────────
// 	for (const customerId of ALL_CUSTOMER_IDS) {
// 		const existing = await mildredService.listAnalyticsIdentities({ actor_id: customerId })
// 		if (existing.length === 0) {
// 			await mildredService.createAnalyticsIdentities({
// 				actor_id: customerId,
// 				customer_id: customerId,
// 				properties: { email: `${customerId.slice(-6)}@example.com` },
// 				anonymous_ids: [] as unknown as Record<string, unknown>,
// 				last_seen_at: new Date()
// 			})
// 		}
// 	}

// 	// ── Create a default funnel ─────────────────────────────────────────
// 	const existingFunnels = await mildredService.listAnalyticsFunnels({ name: 'main_conversion' } as any)
// 	if (existingFunnels.length === 0) {
// 		await mildredService.createAnalyticsFunnels({
// 			name: 'main_conversion',
// 			label: 'Main Conversion Funnel',
// 			description: 'Cart → Checkout → Order',
// 			steps: ['cart_created', 'cart_updated', 'checkout_viewed', 'order_placed'] as unknown as Record<string, unknown>,
// 			sales_channel_id: SALES_CHANNEL_ID,
// 			is_default: true
// 		})
// 		logger.info('seed-analytics: created default funnel "main_conversion"')
// 	}

// 	// ── Create a sample segment ─────────────────────────────────────────
// 	const existingSegments = await mildredService.listAnalyticsSegments({ name: 'repeat_buyers' } as any)
// 	if (existingSegments.length === 0) {
// 		await mildredService.createAnalyticsSegments({
// 			name: 'repeat_buyers',
// 			label: 'Repeat Buyers',
// 			description: 'Customers who placed 2+ orders in the last 90 days',
// 			rules: {
// 				operator: 'AND',
// 				conditions: [
// 					{ type: 'event_performed', event: 'order_placed', count: { '$gte': 2 }, timeframe_days: 90 }
// 				]
// 			} as unknown as Record<string, unknown>,
// 			sales_channel_id: null,
// 			created_by: null
// 		})
// 		logger.info('seed-analytics: created sample segment "repeat_buyers"')
// 	}

// 	logger.info(`seed-analytics: done — ${events.length} events, 2 rubrics, 1 funnel, 1 segment`)
// }
