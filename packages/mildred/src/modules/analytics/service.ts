import { MedusaService } from '@medusajs/framework/utils'
import { AnalyticsRubric } from './models/analytics-rubric'
import { AnalyticsEvent, AnalyticsEventSource } from './models/analytics-event'
import { AnalyticsIdentity } from './models/analytics-identity'
import { AnalyticsFunnel } from './models/analytics-funnel'
import { AnalyticsEventDaily } from './models/analytics-event-daily'
import { AnalyticsSegment } from './models/analytics-segment'
import { AnalyticsSegmentMembership } from './models/analytics-segment-membership'

type TrackEventInput = {
	event: string
	actor_id?: string | null
	group_type?: string | null
	group_id?: string | null
	properties?: Record<string, unknown> | null
	session_id?: string | null
	source?: 'storefront' | 'backend'
	sales_channel_id?: string | null
}

type IdentifyInput = {
	actor_id: string
	customer_id?: string | null
	anonymous_id?: string | null
	properties?: Record<string, unknown> | null
}

type EventQueryFilters = {
	event?: string
	actor_id?: string
	source?: string
	start_date?: Date
	end_date?: Date
	limit?: number
	offset?: number
}

type EventCountsInput = {
	event?: string[]
	start_date: Date
	end_date: Date
	granularity: 'hour' | 'day' | 'week'
	sales_channel_id?: string | null
}

type FunnelInput = {
	steps: string[]
	start_date: Date
	end_date: Date
	sales_channel_id?: string | null
}

type SegmentCondition = {
	type: 'event_performed' | 'event_not_performed' | 'identity_property'
	event?: string
	count?: Record<string, number>
	timeframe_days?: number
	key?: string
	operator?: string
}

type SegmentRules = {
	operator: 'AND' | 'OR'
	conditions: SegmentCondition[]
}

export class MildredService extends MedusaService({
	AnalyticsRubric,
	AnalyticsEvent,
	AnalyticsIdentity,
	AnalyticsFunnel,
	AnalyticsEventDaily,
	AnalyticsSegment,
	AnalyticsSegmentMembership
}) {
	async trackEvent(data: TrackEventInput | TrackEventInput[]) {
		const events = Array.isArray(data) ? data : [data]
		const records = events.map(e => ({
			event: e.event,
			actor_id: e.actor_id ?? null,
			group_type: e.group_type ?? null,
			group_id: e.group_id ?? null,
			properties: e.properties ?? null,
			session_id: e.session_id ?? null,
			source: (e.source ?? 'backend') as AnalyticsEventSource,
			sales_channel_id: e.sales_channel_id ?? null,
			timestamp: new Date()
		}))
		await this.createAnalyticsEvents(records)
	}

	async identifyActor(data: IdentifyInput) {
		const { actor_id, customer_id, anonymous_id, properties } = data

		// If an anonymous_id is provided, perform identity stitching
		if (anonymous_id) {
			const existing = await this.listAnalyticsIdentities({ actor_id: anonymous_id })
			const anonIdentity = existing[0]

			if (anonIdentity) {
				// Merge anonymous identity into the customer identity
				const mergedProperties = {
					...(anonIdentity.properties as Record<string, unknown> ?? {}),
					...(properties ?? {})
				}

				// Check if the customer identity already exists
				const customerIdentities = await this.listAnalyticsIdentities({ actor_id })
				const customerIdentity = customerIdentities[0]

				if (customerIdentity) {
					// Customer identity exists — merge in anonymous data
					const existingAnonIds = (customerIdentity.anonymous_ids as unknown as string[]) ?? []
					await this.updateAnalyticsIdentities({
						id: customerIdentity.id,
						properties: {
							...(customerIdentity.properties as Record<string, unknown> ?? {}),
							...mergedProperties
						},
						anonymous_ids: [...existingAnonIds, anonymous_id] as unknown as Record<string, unknown>,
						customer_id: customer_id ?? customerIdentity.customer_id,
						last_seen_at: new Date()
					})
				} else {
					// No customer identity yet — upgrade the anonymous one
					const existingAnonIds = (anonIdentity.anonymous_ids as unknown as string[]) ?? []
					await this.updateAnalyticsIdentities({
						id: anonIdentity.id,
						actor_id,
						customer_id: customer_id ?? null,
						properties: mergedProperties,
						anonymous_ids: [...existingAnonIds, anonymous_id] as unknown as Record<string, unknown>,
						last_seen_at: new Date()
					})
				}

				// Re-attribute past events from anonymous to customer
				const manager = (this as any).__container__?.manager
				if (manager) {
					const knex = manager.getKnex()
					await knex('analytics_event')
						.where('actor_id', anonymous_id)
						.update({ actor_id })
				}

				// Delete the anonymous identity if it's separate from what we just updated
				if (customerIdentities[0] && anonIdentity.id !== customerIdentities[0].id) {
					await this.deleteAnalyticsIdentities([anonIdentity.id])
				}

				return
			}
		}

		// Standard upsert — no stitching needed
		const existing = await this.listAnalyticsIdentities({ actor_id })
		if (existing[0]) {
			await this.updateAnalyticsIdentities({
				id: existing[0].id,
				properties: {
					...(existing[0].properties as Record<string, unknown> ?? {}),
					...(properties ?? {})
				},
				customer_id: customer_id ?? existing[0].customer_id,
				last_seen_at: new Date()
			})
		} else {
			await this.createAnalyticsIdentities({
				actor_id,
				customer_id: customer_id ?? null,
				properties: properties ?? null,
				anonymous_ids: [] as unknown as Record<string, unknown>,
				last_seen_at: new Date()
			})
		}
	}

	async getEventCounts(filters: EventCountsInput) {
		const manager = (this as any).__container__?.manager
		if (!manager) throw new Error('Database manager not available')
		const knex = manager.getKnex()

		const query = knex('analytics_event')
			.select(knex.raw(`date_trunc('${filters.granularity}', "timestamp") as date`))
			.select('event')
			.count('* as count')
			.whereBetween('timestamp', [filters.start_date, filters.end_date])
			.whereNull('deleted_at')
			.groupByRaw(`date_trunc('${filters.granularity}', "timestamp"), event`)
			.orderBy('date', 'asc')

		if (filters.event?.length) {
			query.whereIn('event', filters.event)
		}

		if (filters.sales_channel_id) {
			query.where('sales_channel_id', filters.sales_channel_id)
		}

		return query
	}

	async getFunnel(input: FunnelInput) {
		const manager = (this as any).__container__?.manager
		if (!manager) throw new Error('Database manager not available')
		const knex = manager.getKnex()

		const results: { event: string; count: number; conversion_rate: number }[] = []
		let previousActors: string[] | null = null

		for (const step of input.steps) {
			const query = knex('analytics_event')
				.countDistinct('actor_id as count')
				.where('event', step)
				.whereBetween('timestamp', [input.start_date, input.end_date])
				.whereNotNull('actor_id')
				.whereNull('deleted_at')

			if (input.sales_channel_id) {
				query.where('sales_channel_id', input.sales_channel_id)
			}

			if (previousActors?.length) {
				query.whereIn('actor_id', previousActors)
			}

			const [{ count }] = await query
			const numCount = Number(count)

			const firstStepCount = results.length > 0 ? results[0].count : numCount
			results.push({
				event: step,
				count: numCount,
				conversion_rate: firstStepCount > 0 ? numCount / firstStepCount : 0
			})

			// Get the actor_ids for this step to filter the next step
			const actorQuery = knex('analytics_event')
				.distinct('actor_id')
				.where('event', step)
				.whereBetween('timestamp', [input.start_date, input.end_date])
				.whereNotNull('actor_id')
				.whereNull('deleted_at')

			if (input.sales_channel_id) {
				actorQuery.where('sales_channel_id', input.sales_channel_id)
			}

			if (previousActors?.length) {
				actorQuery.whereIn('actor_id', previousActors)
			}

			const actorRows = await actorQuery
			previousActors = actorRows.map((r: { actor_id: string }) => r.actor_id)
		}

		return results
	}

	async evaluateSegmentRules(rules: SegmentRules, salesChannelId?: string | null): Promise<string[]> {
		const manager = (this as any).__container__?.manager
		if (!manager) throw new Error('Database manager not available')
		const knex = manager.getKnex()

		const conditionResults: Set<string>[] = []

		for (const condition of rules.conditions) {
			const cutoff = condition.timeframe_days
				? new Date(Date.now() - condition.timeframe_days * 86400000)
				: null

			if (condition.type === 'event_performed' && condition.event) {
				const query = knex('analytics_event')
					.select('actor_id')
					.count('* as cnt')
					.where('event', condition.event)
					.whereNotNull('actor_id')
					.whereNull('deleted_at')
					.groupBy('actor_id')

				if (cutoff) query.where('timestamp', '>=', cutoff)
				if (salesChannelId) query.where('sales_channel_id', salesChannelId)

				if (condition.count) {
					const [[op, val]] = Object.entries(condition.count)
					const sqlOp = op === '$gte' ? '>=' : op === '$gt' ? '>' : op === '$lte' ? '<=' : op === '$lt' ? '<' : '='
					query.having(knex.raw(`count(*) ${sqlOp} ?`, [val]))
				}

				const rows = await query
				conditionResults.push(new Set(rows.map((r: any) => r.actor_id)))

			} else if (condition.type === 'event_not_performed' && condition.event) {
				const subquery = knex('analytics_event')
					.select('actor_id')
					.where('event', condition.event)
					.whereNotNull('actor_id')
					.whereNull('deleted_at')

				if (cutoff) subquery.where('timestamp', '>=', cutoff)
				if (salesChannelId) subquery.where('sales_channel_id', salesChannelId)

				const rows = await knex('analytics_identity')
					.select('actor_id')
					.whereNull('deleted_at')
					.whereNotIn('actor_id', subquery)

				conditionResults.push(new Set(rows.map((r: any) => r.actor_id)))

			} else if (condition.type === 'identity_property' && condition.key) {
				let rows
				if (condition.operator === '$exists') {
					rows = await knex('analytics_identity')
						.select('actor_id')
						.whereNull('deleted_at')
						.whereRaw(`properties->? IS NOT NULL`, [condition.key])
				} else {
					rows = await knex('analytics_identity')
						.select('actor_id')
						.whereNull('deleted_at')
						.whereRaw(`properties->>? IS NOT NULL`, [condition.key])
				}
				conditionResults.push(new Set(rows.map((r: any) => r.actor_id)))
			}
		}

		if (conditionResults.length === 0) return []

		if (rules.operator === 'AND') {
			const intersection = conditionResults.reduce((acc, set) => {
				return new Set([...acc].filter(id => set.has(id)))
			})
			return [...intersection]
		} else {
			const union = conditionResults.reduce((acc, set) => {
				set.forEach(id => acc.add(id))
				return acc
			}, new Set<string>())
			return [...union]
		}
	}
}
