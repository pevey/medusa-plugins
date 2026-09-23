import { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { restrictedFieldsForPath } from './field-restrictions'

/**
 * What `?order=` is rewritten to when it names a restricted segment. Core then
 * produces its own genuine unknown-field response for whatever shape the route
 * has (400 naming the field on routes with an `allowed` list, opaque 500 on
 * other list routes, zod 400 where `order` is not an accepted param, ignored
 * where the handler never reads it) — responding here with any hand-built error
 * would be distinguishable from that baseline on at least one of those shapes.
 * Wherever core echoes the field name, the response wrapper swaps this marker
 * back to the client's own field, so the answer is exactly what a nonexistent
 * field of that name would get. Sorting by a restricted column must not
 * proceed: result ordering is a value side-channel the response strip cannot
 * close.
 */
const UNORDERABLE_FIELD = '__restricted_field__'

/**
 * Replace every occurrence of `marker` in the string values of `body`, in
 * place. Returns the replacement for a bare string body, since a primitive
 * cannot be mutated.
 */
function replaceInStrings(body: unknown, marker: string, replacement: string): unknown {
	if (typeof body === 'string') {
		return body.split(marker).join(replacement)
	}

	const seen = new WeakSet<object>()

	const walk = (node: unknown): void => {
		if (!node || typeof node !== 'object' || seen.has(node as object)) {
			return
		}
		seen.add(node as object)

		const record = node as Record<string, unknown>
		for (const key of Object.keys(record)) {
			const value = record[key]
			if (typeof value === 'string') {
				if (value.includes(marker)) {
					record[key] = value.split(marker).join(replacement)
				}
			} else {
				walk(value)
			}
		}
	}

	walk(body)
	return body
}

/**
 * Flatten the raw `?fields=` input to the paths the client explicitly typed.
 * Runs on the pre-validation query object, so the value may be a string, an
 * array (`fields[]=`), or absent. `-` entries are removals, not requests, and
 * are dropped; `+` and `*` prefixes are selection syntax, not path segments.
 */
export function parseRequestedFieldPaths(raw: unknown): string[] {
	const inputs = Array.isArray(raw) ? raw : raw == null ? [] : [raw]

	return inputs
		.filter((value): value is string => typeof value === 'string')
		.flatMap(value => value.split(','))
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0 && !entry.startsWith('-'))
		.map(entry => entry.replace(/^[+*]/, ''))
}

/**
 * Delete every key named by a restricted segment, at any depth strictly below
 * the response envelope. The envelope's own keys (`{ order: {…} }` from
 * `/store/orders/:id`, `{ orders: [], count }` from the list route) name the
 * route's entity, not an expanded field — core's own semantics restrict what
 * can be *reached through* other entities, not what a route is for. Routes
 * must envelope their responses (the Medusa convention) for this distinction
 * to hold; a route returning a bare entity object exposes its top-level keys
 * as envelope.
 */
export function stripRestrictedSegments(body: unknown, segments: Set<string>): boolean {
	if (!body || typeof body !== 'object') {
		return false
	}

	let stripped = false
	const seen = new WeakSet<object>()

	const walk = (node: unknown): void => {
		if (!node || typeof node !== 'object' || seen.has(node as object)) {
			return
		}
		seen.add(node as object)

		if (Array.isArray(node)) {
			for (const item of node) {
				walk(item)
			}
			return
		}

		for (const key of Object.keys(node)) {
			if (segments.has(key)) {
				delete (node as Record<string, unknown>)[key]
				stripped = true
				continue
			}
			walk((node as Record<string, unknown>)[key])
		}
	}

	// Envelope level: recurse into values without deleting the keys themselves.
	if (Array.isArray(body)) {
		for (const item of body) {
			walk(item)
		}
	} else {
		for (const key of Object.keys(body)) {
			walk((body as Record<string, unknown>)[key])
		}
	}

	return stripped
}

function logRestrictedFields(req: MedusaRequest, message: string): void {
	try {
		const logger: any = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
		logger?.debug?.(`[access] ${message}: ${req.method} ${(req as any).originalUrl}`)
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

/**
 * Enforces restricted fields: core `http.restrictedFields` config unioned with
 * `declareRestrictedFields` registry declarations, on any matching route
 * prefix. Core strips `req.restrictedFields` from the query only on routes
 * without an `allowed` list and never inspects `?order=` or the response body,
 * so this middleware closes those gaps and covers prefixes core does not.
 *
 * Silent-everywhere by design: stripping a restricted field is
 * byte-indistinguishable from the field not existing (core returns 200 with
 * unknown `?fields=` entries silently absent), so there is no response that
 * confirms a field exists or is sensitive. Explicit probes are recorded in the
 * operator log instead — uniform external responses, stratified logs, per the
 * house pattern. Applies to undeclared routes too: this enforces operator and
 * plugin *configuration*, not route access policies, so the guard's fail-open
 * contract for undeclared routes does not extend here.
 */
export async function restrictedFieldsGuard(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): Promise<void> {
	// `req.path` is relative to the mount point under a `/*` matcher; the full
	// path lives on `originalUrl`.
	const path = ((req as any).originalUrl as string).split('?')[0]

	const registrySegments = restrictedFieldsForPath(path)

	// Feed declarations into core's own carrier so declared fields get core's
	// query-side stripping (never fetched) on routes without an `allowed` list.
	// `/store`, `/admin`, and `/rbac` carry an instance; other prefixes rely on
	// the response strip.
	if (registrySegments.size) {
		req.restrictedFields?.add([...registrySegments])
	}

	const applicable = new Set([...(req.restrictedFields?.list() ?? []), ...registrySegments])
	if (!applicable.size) {
		return next()
	}

	const hasRestrictedSegment = (fieldPath: string) => fieldPath.split('.').some(segment => applicable.has(segment))

	const explicitlyRequested = parseRequestedFieldPaths(req.query?.fields).filter(hasRestrictedSegment)
	if (explicitlyRequested.length) {
		logRestrictedFields(req, `restricted_field_probe (fields: ${explicitlyRequested.join(', ')})`)
	}

	let maskedOrderField: string | undefined
	const rawOrder = req.query?.order
	if (typeof rawOrder === 'string' && hasRestrictedSegment(rawOrder.replace(/^-/, ''))) {
		logRestrictedFields(req, `restricted_field_probe (order: ${rawOrder})`)
		maskedOrderField = rawOrder.replace(/^-/, '')
		req.query.order = (rawOrder.startsWith('-') ? '-' : '') + UNORDERABLE_FIELD
	}

	const originalJson = res.json.bind(res)
	;(res as any).json = (body: unknown) => {
		try {
			if (maskedOrderField) {
				body = replaceInStrings(body, UNORDERABLE_FIELD, maskedOrderField)
			}
			if (stripRestrictedSegments(body, applicable) && !explicitlyRequested.length) {
				logRestrictedFields(req, 'restricted fields stripped')
			}
		} catch (error) {
			// Fail closed: the declared contract is that these fields are never
			// disclosed, and unlike the policy field-filter there is no other layer
			// enforcing it. The body mirrors core's generic handler, so nothing is
			// disclosed by the failure either.
			try {
				const logger: any = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
				logger?.error?.(`[access] restricted-field strip failed — responding opaquely: ${error instanceof Error ? error.message : String(error)}`)
			} catch {
				// A container without a logger is not a reason to fail differently.
			}
			if (!res.headersSent) {
				res.status(500)
				return originalJson({ code: 'unknown_error', type: 'unknown_error', message: 'An unknown error occurred.' })
			}
			return res
		}
		return originalJson(body)
	}

	return next()
}
