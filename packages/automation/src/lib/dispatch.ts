// Shared action execution pipeline — used by the subscriber, webhook handler,
// and MCP tools.  Each caller resolves the action + payload, this module
// handles mapping, HTTP calls / workflow execution, signing, and delivery recording.

import { createHmac } from 'crypto'
import * as coreFlows from '@medusajs/medusa/core-flows'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AutomationActionType, FieldMapping, StaticValue } from '../modules/automation/models/automation-action'
import { AutomationDeliveryStatus } from '../modules/automation/models/automation-delivery'
import { AutomationService } from '../modules/automation/service'
import { AUTOMATION_MODULE } from '../modules/automation'

// ─── Mapping helpers ──────────────────────────────────────────────────────────

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce((curr: unknown, key: string) => {
		if (curr !== null && typeof curr === 'object') {
			return (curr as Record<string, unknown>)[key]
		}
		return undefined
	}, obj)
}

export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
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

export function applyMappings(
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

export function applyMappingsWithCoercion(
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

export function applyStaticValues(
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

export function flattenForQueryParams(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
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

export function resolveEventRefs(
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
	arrayPath: string
	itemPath: string
	targetKey: string
}

export function parseFanoutMappings(mappings: FieldMapping[]): FanoutMapping[] {
	const result: FanoutMapping[] = []
	for (const m of mappings) {
		const match = m.source_path.match(/^(.+?)\[\]\.?(.*)$/)
		if (match) {
			result.push({ arrayPath: match[1], itemPath: match[2], targetKey: m.target_key })
		}
	}
	return result
}

export function buildIterationPayload(
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

// ─── Payload size helper ──────────────────────────────────────────────────────

export function parseMaxBytes(value: string | number | undefined): number {
	if (value === undefined) return 100 * 1024
	if (typeof value === 'number') return value
	const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb|b)?$/i)
	if (!match) return 100 * 1024
	const num = parseFloat(match[1])
	const unit = (match[2] ?? 'b').toLowerCase()
	const multipliers: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }
	return Math.floor(num * (multipliers[unit] ?? 1))
}

// ─── Query augmentation ───────────────────────────────────────────────────────

export async function augmentWithQuery(
	container: MedusaContainer,
	automationService: AutomationService,
	actionId: string,
	eventData: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const sourceData: Record<string, unknown> = { ...eventData }

	const queryConfigs = await automationService.listAutomationQueries(
		{ action_id: actionId },
		{ take: 1 }
	)
	const queryConfig = queryConfigs[0] ?? null

	if (queryConfig) {
		try {
			const medusaQuery = container.resolve(ContainerRegistrationKeys.QUERY)
			const resolvedFilters = resolveEventRefs(
				queryConfig.filters as Record<string, unknown>,
				eventData
			)
			const { data } = await medusaQuery.graph({
				entity: queryConfig.entity_name as string,
				fields: (queryConfig.fields as unknown as string[]) ?? ['*'],
				filters: resolvedFilters,
				pagination: { take: Math.min((queryConfig.limit as number) ?? 10, 100) }
			})
			sourceData[queryConfig.entity_name as string] = data[0] ?? null
			sourceData[`${queryConfig.entity_name}_list`] = data
		} catch (err) {
			sourceData._query_error = err instanceof Error ? err.message : String(err)
		}
	}

	return sourceData
}

// ─── Core dispatch: execute a single action against a payload ─────────────────

export type DispatchResult = {
	status: AutomationDeliveryStatus
	responseStatus: number | null
	responseBody: string | null
	errorMessage: string | null
}

export type DispatchOptions = {
	/** Whether to sign outgoing webhooks (subscriber: yes, incoming webhook handler: no) */
	signOutgoing?: boolean
	/** Max workflow fan-out iterations (from plugin options) */
	maxWorkflowIterations?: number
}

/**
 * Execute a single action's pipeline: mapping → HTTP/workflow → result.
 * Does NOT record a delivery — the caller is responsible for that.
 */
export async function dispatchAction(
	container: MedusaContainer,
	action: any,
	sourceData: Record<string, unknown>,
	opts: DispatchOptions = {}
): Promise<DispatchResult> {
	const automationService = container.resolve(AUTOMATION_MODULE) as AutomationService
	const mappings: FieldMapping[] = Array.isArray(action.field_mappings)
		? (action.field_mappings as FieldMapping[])
		: []
	const statics: StaticValue[] = Array.isArray(action.static_values)
		? (action.static_values as StaticValue[])
		: []

	let status = AutomationDeliveryStatus.PENDING
	let responseStatus: number | null = null
	let responseBody: string | null = null
	let errorMessage: string | null = null

	try {
		if (action.action_type === AutomationActionType.OUTGOING_WEBHOOK) {
			if (!action.target_url) throw new Error('No target URL configured')

			const dynamicPayload = applyMappings(sourceData, mappings)
			const mappedPayload = applyStaticValues(dynamicPayload, statics)
			const bodyStr = JSON.stringify(mappedPayload)

			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (Array.isArray(action.target_headers)) {
				for (const h of action.target_headers as Array<{ key: string; value: string }>) {
					if (h.key) headers[h.key] = h.value
				}
			}

			if (opts.signOutgoing && action.signing_secret_id) {
				const [secret] = await automationService.listAutomationSecrets(
					{ id: action.signing_secret_id },
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
				? AutomationDeliveryStatus.SUCCESS
				: AutomationDeliveryStatus.FAILED
			if (!response.ok) {
				errorMessage = `HTTP ${response.status}: ${responseBody?.slice(0, 200) ?? 'no body'}`
			}
		} else if ((action.action_type as string) === 'outgoing_request') {
			if (!action.target_url) throw new Error('No target URL configured')

			const method = (action.request_method as string) || 'POST'
			const dynamicPayload = applyMappings(sourceData, mappings)
			const mappedPayload = applyStaticValues(dynamicPayload, statics)

			const headers: Record<string, string> = {}
			if (Array.isArray(action.target_headers)) {
				for (const h of action.target_headers as Array<{ key: string; value: string }>) {
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
				? AutomationDeliveryStatus.SUCCESS
				: AutomationDeliveryStatus.FAILED
			if (!response.ok) {
				errorMessage = `HTTP ${response.status}: ${responseBody?.slice(0, 200) ?? 'no body'}`
			}
		} else if (action.action_type === AutomationActionType.MEDUSA_WORKFLOW) {
			if (!action.medusa_workflow) throw new Error('No workflow configured')

			const workflowFn = (coreFlows as Record<string, unknown>)[action.medusa_workflow]
			if (typeof workflowFn !== 'function') {
				throw new Error(`Unknown workflow: "${action.medusa_workflow}"`)
			}

			const run = (
				workflowFn as (c: unknown) => { run: (o: { input: unknown }) => Promise<unknown> }
			)(container).run

			const fanoutMappings = parseFanoutMappings(mappings)

			if (fanoutMappings.length > 0) {
				const arrayPath = fanoutMappings[0].arrayPath
				const raw = getNestedValue(sourceData, arrayPath)
				const items: unknown[] = Array.isArray(raw)
					? raw
					: raw !== undefined && raw !== null
						? [raw]
						: []

				const maxIter = opts.maxWorkflowIterations
				const cap = maxIter === 0 ? undefined : (maxIter ?? 50)
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
					status = AutomationDeliveryStatus.SUCCESS
				} else {
					status = AutomationDeliveryStatus.FAILED
					errorMessage = `${iterErrors.length}/${cappedItems.length} iterations failed: ${iterErrors.slice(0, 3).join('; ')}`
				}
			} else {
				const mappedPayload = applyMappingsWithCoercion(sourceData, mappings)
				const finalPayload = applyStaticValues(mappedPayload, statics)
				await run({ input: finalPayload })
				status = AutomationDeliveryStatus.SUCCESS
			}
		}
	} catch (err) {
		status = AutomationDeliveryStatus.FAILED
		errorMessage = err instanceof Error ? err.message : String(err)
	}

	return { status, responseStatus, responseBody, errorMessage }
}

// ─── High-level: dispatch + record delivery ───────────────────────────────────

/**
 * Execute an action and record the delivery.
 * This is the main entry point used by the subscriber and webhook handler.
 */
export async function dispatchAndRecord(
	container: MedusaContainer,
	action: any,
	sourceData: Record<string, unknown>,
	eventName: string,
	opts: DispatchOptions = {}
): Promise<DispatchResult> {
	const automationService = container.resolve(AUTOMATION_MODULE) as AutomationService
	const result = await dispatchAction(container, action, sourceData, opts)

	await automationService.createAutomationDeliveries({
		action_id: action.id,
		event_name: eventName,
		request_payload: sourceData,
		response_status: result.responseStatus,
		response_body: result.responseBody,
		status: result.status,
		attempts: 1,
		error_message: result.errorMessage
	} as any)

	return result
}
