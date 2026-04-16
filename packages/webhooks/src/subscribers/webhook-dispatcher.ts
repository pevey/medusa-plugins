// Listens to every standard Medusa event (trigger_type === 'medusa_event') and
// dispatches all active actions for each matching trigger.
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import * as coreFlows from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createHmac } from 'crypto'
import { WEBHOOK_MODULE } from '../modules/webhook'
import { WebhookService } from '../modules/webhook/service'
import { WebhookTriggerType } from '../modules/webhook/models/webhook-trigger'
import { WebhookActionType, FieldMapping } from '../modules/webhook/models/webhook-action'

type StaticValue = { key: string; value: string }
import { WebhookDeliveryStatus } from '../modules/webhook/models/webhook-delivery'
import { MEDUSA_EVENTS } from '../admin/lib/medusa-events'

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce((curr: unknown, key: string) => {
		if (curr !== null && typeof curr === 'object') {
			return (curr as Record<string, unknown>)[key]
		}
		return undefined
	}, obj)
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
	const keys = path.split('.')
	let curr = obj
	for (let i = 0; i < keys.length - 1; i++) {
		if (!(keys[i] in curr) || typeof curr[keys[i]] !== 'object') {
			curr[keys[i]] = {}
		}
		curr = curr[keys[i]] as Record<string, unknown>
	}
	curr[keys[keys.length - 1]] = value
}

// Simple mapping for outgoing webhooks — no coercion, no fan-out.
function applyMappings(
	source: Record<string, unknown>,
	mappings: FieldMapping[]
): Record<string, unknown> {
	if (!mappings || mappings.length === 0) return source
	const result: Record<string, unknown> = {}
	for (const mapping of mappings) {
		const value = getNestedValue(source, mapping.source_path)
		if (value !== undefined) setNestedValue(result, mapping.target_key, value)
	}
	return result
}

// Mapping for workflow single-call path — coerces source to array when target
// key ends with `[]` and source is not already an array.
function applyMappingsWithCoercion(
	source: Record<string, unknown>,
	mappings: FieldMapping[]
): Record<string, unknown> {
	if (!mappings || mappings.length === 0) return source
	const result: Record<string, unknown> = {}
	for (const mapping of mappings) {
		let value = getNestedValue(source, mapping.source_path)
		if (value === undefined) continue
		let targetKey = mapping.target_key
		if (targetKey.endsWith('[]')) {
			targetKey = targetKey.slice(0, -2)
			if (!Array.isArray(value)) value = [value]
		}
		setNestedValue(result, targetKey, value)
	}
	return result
}

function applyStaticValues(
	base: Record<string, unknown>,
	statics: StaticValue[]
): Record<string, unknown> {
	if (!statics || statics.length === 0) return base
	const result = { ...base }
	for (const s of statics) {
		if (s.key) setNestedValue(result, s.key, s.value)
	}
	return result
}

// Recursively flatten a nested object to dot-notation key/value string pairs
// for use as URL query parameters.
function flattenForQueryParams(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
	const result: Record<string, string> = {}
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key
		if (
			value !== null &&
			value !== undefined &&
			typeof value === 'object' &&
			!Array.isArray(value)
		) {
			Object.assign(result, flattenForQueryParams(value as Record<string, unknown>, fullKey))
		} else if (value !== null && value !== undefined) {
			result[fullKey] = String(value)
		}
	}
	return result
}

// ─── Query helpers ────────────────────────────────────────────────────────────

// Recursively walk filter values and replace "$event.some.path" strings with
// the corresponding value from the event data.
function resolveEventRefs(
	filters: unknown,
	eventData: Record<string, unknown>
): Record<string, unknown> {
	function resolve(val: unknown): unknown {
		if (typeof val === 'string' && val.startsWith('$event.')) {
			return getNestedValue(eventData, val.slice(7)) ?? val
		}
		if (Array.isArray(val)) return val.map(resolve)
		if (val !== null && typeof val === 'object') {
			return Object.fromEntries(
				Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, resolve(v)])
			)
		}
		return val
	}
	if (!filters || typeof filters !== 'object') return {}
	return resolve(filters) as Record<string, unknown>
}

// ─── Fan-out helpers ──────────────────────────────────────────────────────────

type FanoutMapping = {
	arrayPath: string // e.g. "customers" from "customers[].id"
	itemPath: string // e.g. "id" from "customers[].id" (empty = whole item)
	targetKey: string
}

function parseFanoutMappings(mappings: FieldMapping[]): FanoutMapping[] {
	const result: FanoutMapping[] = []
	for (const m of mappings) {
		const match = m.source_path.match(/^(.+?)\[\]\.?(.*)$/)
		if (match) {
			result.push({ arrayPath: match[1], itemPath: match[2], targetKey: m.target_key })
		}
	}
	return result
}

function buildIterationPayload(
	item: unknown,
	fanout: FanoutMapping[],
	direct: FieldMapping[],
	sourceData: Record<string, unknown>
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const m of direct) {
		let value = getNestedValue(sourceData, m.source_path)
		if (value === undefined) continue
		let targetKey = m.target_key
		if (targetKey.endsWith('[]')) {
			targetKey = targetKey.slice(0, -2)
			if (!Array.isArray(value)) value = [value]
		}
		setNestedValue(result, targetKey, value)
	}

	for (const f of fanout) {
		let value = f.itemPath ? getNestedValue(item as Record<string, unknown>, f.itemPath) : item
		if (value === undefined) continue
		let targetKey = f.targetKey
		if (targetKey.endsWith('[]')) {
			targetKey = targetKey.slice(0, -2)
			if (!Array.isArray(value)) value = [value]
		}
		setNestedValue(result, targetKey, value)
	}

	return result
}

// ─── Subscriber ───────────────────────────────────────────────────────────────

export default async function webHookDispatchHandler({
	event: { name: eventName, data: eventData },
	container
}: SubscriberArgs<Record<string, unknown>>) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const webhookService = container.resolve(WEBHOOK_MODULE) as WebhookService

	let triggers: any[]
	try {
		;[triggers] = await webhookService.listAndCountWebhookTriggers({
			trigger_type: WebhookTriggerType.MEDUSA_EVENT,
			is_active: true
		})
	} catch (err) {
		logger.error(
			`webhook-dispatcher: failed to list triggers for ${eventName}: ${err instanceof Error ? err.message : JSON.stringify(err)}`
		)
		return
	}

	const matchingTriggers = triggers.filter(trigger => {
		const events: string[] = Array.isArray(trigger.trigger_events) ? trigger.trigger_events : []
		return events.includes(eventName)
	})

	if (matchingTriggers.length === 0) return

	// For each matching trigger, dispatch all its active actions
	await Promise.allSettled(
		matchingTriggers.map(async trigger => {
			const [actions] = await webhookService.listAndCountWebhookActions({
				trigger_id: trigger.id,
				is_active: true
			})

			await Promise.allSettled(
				actions.map(async action => {
					const mappings: FieldMapping[] = Array.isArray(action.field_mappings)
						? (action.field_mappings as FieldMapping[])
						: []
					const statics: StaticValue[] = Array.isArray((action as any).static_values)
						? ((action as any).static_values as StaticValue[])
						: []

					// ── Step 1: Optionally augment event data with a query ──────────
					let sourceData: Record<string, unknown> = {
						...(eventData as Record<string, unknown>)
					}

					const queryConfigs = await webhookService.listWebhookQueries(
						{ action_id: action.id },
						{ take: 1 }
					)
					const queryConfig = queryConfigs[0] ?? null

					if (queryConfig) {
						try {
							const medusaQuery = container.resolve(ContainerRegistrationKeys.QUERY)
							const resolvedFilters = resolveEventRefs(
								queryConfig.filters as Record<string, unknown>,
								eventData as Record<string, unknown>
							)
							const { data } = await medusaQuery.graph({
								entity: queryConfig.entity_name as string,
								fields: (queryConfig.fields as unknown as string[]) ?? ['*'],
								filters: resolvedFilters,
								pagination: { take: Math.min((queryConfig.limit as number) ?? 10, 100) }
							})
							// Merge first result under entity name for single-entity use cases,
							// and the full list under entity_name_list for multi-result use cases.
							sourceData[queryConfig.entity_name as string] = data[0] ?? null
							sourceData[`${queryConfig.entity_name}_list`] = data
						} catch (err) {
							// Query failure is non-fatal — proceed with raw event data
							sourceData._query_error = err instanceof Error ? err.message : String(err)
						}
					}

					// ── Step 2: Map and dispatch ────────────────────────────────────
					let status = WebhookDeliveryStatus.PENDING
					let responseStatus: number | null = null
					let responseBody: string | null = null
					let errorMessage: string | null = null

					try {
						if (action.action_type === WebhookActionType.OUTGOING_WEBHOOK) {
							// Simple mapping — no fan-out, arrays pass through as-is
							if (!action.target_url) throw new Error('No target URL configured')

							const dynamicPayload = applyMappings(sourceData, mappings)
							const mappedPayload = applyStaticValues(dynamicPayload, statics)

							const bodyStr = JSON.stringify(mappedPayload)

							const headers: Record<string, string> = { 'Content-Type': 'application/json' }
							if (Array.isArray(action.target_headers)) {
								for (const h of action.target_headers as Array<{
									key: string
									value: string
								}>) {
									if (h.key) headers[h.key] = h.value
								}
							}

							// Sign outgoing payload when a signing secret is configured
							if ((action as any).signing_secret_id) {
								const [secret] = await webhookService.listWebhookSecrets(
									{ id: (action as any).signing_secret_id },
									{ take: 1 }
								)
								if (secret?.secret) {
									const sig = createHmac('sha256', secret.secret)
										.update(bodyStr)
										.digest('hex')
									headers['x-webhook-signature'] = sig
								}
							}

							const controller = new AbortController()
							const timeout = setTimeout(() => controller.abort(), 10000)

							const response = await fetch(action.target_url, {
								method: 'POST',
								headers,
								body: bodyStr,
								signal: controller.signal
							})

							clearTimeout(timeout)
							responseStatus = response.status
							responseBody = await response.text().catch(() => null)
							status = response.ok
								? WebhookDeliveryStatus.SUCCESS
								: WebhookDeliveryStatus.FAILED
							if (!response.ok) {
								errorMessage = `HTTP ${response.status}: ${responseBody?.slice(0, 200) ?? 'no body'}`
							}
						} else if ((action.action_type as string) === 'outgoing_request') {
							if (!action.target_url) throw new Error('No target URL configured')

							const method = ((action as any).request_method as string) || 'POST'
							const dynamicPayload = applyMappings(sourceData, mappings)
							const mappedPayload = applyStaticValues(dynamicPayload, statics)

							const headers: Record<string, string> = {}
							if (Array.isArray(action.target_headers)) {
								for (const h of action.target_headers as Array<{
									key: string
									value: string
								}>) {
									if (h.key) headers[h.key] = h.value
								}
							}

							let requestUrl = action.target_url
							let requestBody: string | undefined

							if (method === 'GET' || method === 'DELETE') {
								const flat = flattenForQueryParams(mappedPayload)
								const qs = new URLSearchParams(flat).toString()
								if (qs) requestUrl = `${action.target_url}?${qs}`
							} else {
								// POST or PUT — JSON body
								headers['Content-Type'] = 'application/json'
								requestBody = JSON.stringify(mappedPayload)
							}

							const controller = new AbortController()
							const timeout = setTimeout(() => controller.abort(), 10000)

							const response = await fetch(requestUrl, {
								method,
								headers,
								body: requestBody,
								signal: controller.signal
							})

							clearTimeout(timeout)
							responseStatus = response.status
							responseBody = await response.text().catch(() => null)
							status = response.ok
								? WebhookDeliveryStatus.SUCCESS
								: WebhookDeliveryStatus.FAILED
							if (!response.ok) {
								errorMessage = `HTTP ${response.status}: ${responseBody?.slice(0, 200) ?? 'no body'}`
							}
						} else if (action.action_type === WebhookActionType.MEDUSA_WORKFLOW) {
							if (!action.medusa_workflow) throw new Error('No workflow configured')

							const workflowFn = (coreFlows as Record<string, unknown>)[
								action.medusa_workflow
							]
							if (typeof workflowFn !== 'function') {
								throw new Error(`Unknown workflow: "${action.medusa_workflow}"`)
							}

							const run = (
								workflowFn as (c: unknown) => {
									run: (o: { input: unknown }) => Promise<unknown>
								}
							)(container).run

							const fanoutMappings = parseFanoutMappings(mappings)

							if (fanoutMappings.length > 0) {
								// Fan-out: iterate over the source array, run workflow once per item
								const arrayPath = fanoutMappings[0].arrayPath
								const raw = getNestedValue(sourceData, arrayPath)
								const items: unknown[] = Array.isArray(raw)
									? raw
									: raw !== undefined && raw !== null
										? [raw]
										: []

								const maxIterOpt = webhookService.getOptions().maxWorkflowIterations
								const cap = maxIterOpt === 0 ? undefined : (maxIterOpt ?? 50)
								const cappedItems = cap !== undefined ? items.slice(0, cap) : items

								const directMappings = mappings.filter(m => !m.source_path.includes('[]'))
								const iterErrors: string[] = []

								for (const item of cappedItems) {
									const payload = buildIterationPayload(
										item,
										fanoutMappings,
										directMappings,
										sourceData
									)
									const finalPayload = applyStaticValues(payload, statics)
									try {
										await run({ input: finalPayload })
									} catch (err) {
										iterErrors.push(err instanceof Error ? err.message : String(err))
									}
								}

								if (iterErrors.length === 0) {
									status = WebhookDeliveryStatus.SUCCESS
								} else {
									status = WebhookDeliveryStatus.FAILED
									errorMessage = `${iterErrors.length}/${cappedItems.length} iterations failed: ${iterErrors.slice(0, 3).join('; ')}`
								}
							} else {
								// Single call — coerce source to array when target key ends with []
								const mappedPayload = applyMappingsWithCoercion(sourceData, mappings)
								const finalPayload = applyStaticValues(mappedPayload, statics)
								await run({ input: finalPayload })
								status = WebhookDeliveryStatus.SUCCESS
							}
						}
					} catch (err) {
						status = WebhookDeliveryStatus.FAILED
						errorMessage = err instanceof Error ? err.message : String(err)
					}

					await webhookService.createWebhookDeliveries({
						action_id: action.id,
						event_name: eventName,
						request_payload: sourceData,
						response_status: responseStatus,
						response_body: responseBody,
						status,
						attempts: 1,
						error_message: errorMessage
					} as any)
				})
			)
		})
	)
}

export const config: SubscriberConfig = {
	event: MEDUSA_EVENTS.map(e => e.name)
}
