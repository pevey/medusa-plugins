import type { ContractMap, RouteContract } from './contracts/load.js'

export type FetchOptions = {
	method?: string
	query?: Record<string, unknown>
	body?: unknown
}

export type ResponderContext = {
	path: string
	method: string
	query: Record<string, unknown>
	body: unknown
	params: Record<string, string>
}

/** May be async — `fetch` awaits the result before projecting it. */
export type Responder = (context: ResponderContext) => unknown

export type ContractFake = {
	fetch: (path: string, options?: FetchOptions) => Promise<unknown>
	calls: Array<{ method: string; path: string; query?: Record<string, unknown>; body?: unknown }>
}

const pathSegments = (value: string) => value.replace(/\?.*$/, '').replace(/^\/+/, '').split('/')

function extractParams(matcher: string, path: string): Record<string, string> {
	const matcherSegments = pathSegments(matcher)
	const actualSegments = pathSegments(path)
	const params: Record<string, string> = {}
	matcherSegments.forEach((segment, index) => {
		if (segment.startsWith(':')) params[segment.slice(1)] = actualSegments[index]
	})
	return params
}

/**
 * Strip any field the route's `queryConfig.defaults` does not declare. A UI that reads a
 * field the API stopped returning then breaks in the test exactly as it would in the
 * dashboard, instead of silently rendering `undefined`.
 *
 * `defaults` entries are dot-paths: 'id', 'product.*', 'form_fields.name'. A bare name keeps
 * a scalar; a prefixed name keeps that key of the nested object.
 */
function project(value: unknown, defaults: string[] | undefined): unknown {
	if (!defaults?.length) return value
	if (Array.isArray(value)) return value.map(entry => project(entry, defaults))
	if (value === null || typeof value !== 'object') return value

	const topLevel = new Set(defaults.map(field => field.split('.')[0]))
	const nested = new Map<string, string[]>()
	for (const field of defaults) {
		const [head, ...rest] = field.split('.')
		if (rest.length === 0) continue
		const existing = nested.get(head) ?? []
		nested.set(head, rest[0] === '*' ? [] : [...existing, rest.join('.')])
	}

	const source = value as Record<string, unknown>
	const result: Record<string, unknown> = {}
	for (const key of Object.keys(source)) {
		if (!topLevel.has(key)) continue
		const nestedDefaults = nested.get(key)
		result[key] =
			nestedDefaults && nestedDefaults.length > 0
				? project(source[key], nestedDefaults)
				: source[key]
	}
	return result
}

/**
 * The field list a response should be projected through: the route's `queryConfig.defaults`,
 * adjusted by an explicit `fields` query param the way the real API adjusts it. A bare list
 * replaces the defaults; `+x` / `-x` entries are deltas over them; a mixed form uses the bare
 * entries as the base and then applies the deltas.
 *
 * Anything this cannot interpret throws rather than falling back to `defaults` — answering a
 * `fields` request more generously than the real API is exactly the silent divergence this
 * harness exists to catch.
 */
function resolveFields(
	validatedQuery: Record<string, unknown>,
	contract: RouteContract,
	method: string
): string[] | undefined {
	const defaults = contract.queryConfig?.defaults
	const raw = validatedQuery.fields
	if (raw === undefined) return defaults

	const where = `[admin-test-utils] ${method} ${contract.matcher}`
	if (typeof raw !== 'string') {
		throw new Error(`${where}: \`fields\` must be a comma-separated string, got ${typeof raw}.`)
	}

	const entries = raw.split(',').map(entry => entry.trim())
	if (entries.some(entry => entry === '' || entry === '+' || entry === '-')) {
		throw new Error(`${where}: \`fields\` has an empty entry — ${JSON.stringify(raw)}.`)
	}

	const base = entries.filter(entry => !entry.startsWith('+') && !entry.startsWith('-'))
	const added = entries.filter(entry => entry.startsWith('+')).map(entry => entry.slice(1))
	const removed = new Set(
		entries.filter(entry => entry.startsWith('-')).map(entry => entry.slice(1))
	)

	const resolved = [...(base.length > 0 ? base : (defaults ?? [])), ...added].filter(
		field => !removed.has(field)
	)
	if (resolved.length === 0) {
		throw new Error(
			`${where}: \`fields\` ${JSON.stringify(raw)} resolves to no fields at all against ` +
				`defaults [${(defaults ?? []).join(', ')}].`
		)
	}
	return resolved
}

/** The list/detail payload wrapper is not part of the entity, so project inside it. */
function projectPayload(payload: unknown, fields: string[] | undefined): unknown {
	const defaults = fields
	if (!defaults?.length || payload === null || typeof payload !== 'object') return payload

	const source = payload as Record<string, unknown>
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(source)) {
		// Envelope scalars (count/limit/offset) and non-entity values pass through untouched.
		result[key] =
			Array.isArray(value) || (value !== null && typeof value === 'object')
				? project(value, defaults)
				: value
	}
	return result
}

function describeIssues(error: unknown): string {
	const issues = (error as { issues?: Array<{ path: unknown[]; message: string }> })?.issues
	if (!issues) return String(error)
	return issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
}

export function createContractFake(options: {
	contracts: ContractMap
	responders: Record<string, Responder>
}): ContractFake {
	const calls: ContractFake['calls'] = []

	const fetch = async (path: string, fetchOptions: FetchOptions = {}) => {
		const method = (fetchOptions.method ?? 'GET').toUpperCase()
		const { query, body } = fetchOptions
		calls.push({ method, path, query, body })

		const contract = options.contracts.get(method, path)
		if (!contract) {
			throw new Error(
				`[admin-test-utils] ${method} ${path}: no route in this plugin's middlewares matches. ` +
					`Known matchers: ${options.contracts.matchers().join(', ')}`
			)
		}

		let validatedQuery: Record<string, unknown> = query ?? {}
		if (contract.querySchema) {
			const parsed = contract.querySchema.safeParse(query ?? {})
			if (!parsed.success) {
				throw new Error(
					`[admin-test-utils] ${method} ${contract.matcher}: query rejected by the route's ` +
						`validator — ${describeIssues(parsed.error)}`
				)
			}
			validatedQuery = parsed.data as Record<string, unknown>
		}

		let validatedBody = body
		if (contract.bodySchema) {
			const parsed = contract.bodySchema.safeParse(body ?? {})
			if (!parsed.success) {
				throw new Error(
					`[admin-test-utils] ${method} ${contract.matcher}: body rejected by the route's ` +
						`validator — ${describeIssues(parsed.error)}`
				)
			}
			validatedBody = parsed.data
		}

		const key = `${method} ${contract.matcher}`
		const responder = options.responders[key]
		if (!responder) {
			throw new Error(
				`[admin-test-utils] ${key}: no responder supplied. Add one to the \`responders\` map.`
			)
		}

		// Awaited: a responder is free to be async, and an unawaited Promise would project to
		// `{}` — a full fixture silently becoming an empty payload.
		const payload = await responder({
			path,
			method,
			query: validatedQuery,
			body: validatedBody,
			params: extractParams(contract.matcher, path)
		})

		return projectPayload(payload, resolveFields(validatedQuery, contract, method))
	}

	return { fetch, calls }
}
