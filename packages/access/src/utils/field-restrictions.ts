import { MedusaError } from '@medusajs/framework/utils'
import { matchesPrefixOnSegmentBoundary, normalizePath } from './route-guards'

/**
 * A declaration that responses under `prefix` must never disclose fields whose
 * dot-path contains any of `fields` as a segment — the same segment semantics
 * as core's `http.restrictedFields`. Declarations union-merge: layering can
 * only tighten what a surface discloses, never loosen it.
 */
export type RestrictedFieldsDeclaration = {
	/**
	 * Route prefix the restriction applies to, matched on segment boundaries
	 * (`/content` matches `/content` and `/content/articles`, not `/contents`).
	 * `/` applies everywhere.
	 */
	prefix: string
	/**
	 * Field segments to strip. Segments, not paths: `customer_tags` matches
	 * `customer_tags.tag.name` and `customer.customer_tags` alike.
	 */
	fields: string[]
}

declare global {
	// eslint-disable-next-line no-var
	var AccessRestrictedFields: Map<string, Set<string>> | undefined
}

global.AccessRestrictedFields ??= new Map()

/**
 * Declares fields that responses under a route prefix must never disclose.
 * Enforcement is silent stripping — indistinguishable from the field not
 * existing — by the access plugin's restricted-fields middleware.
 *
 * Callable from any boot phase before the first request (typically a plugin's
 * module loader), with no dependency on the access module having loaded. Other
 * plugins should import this from `medusa-plugin-access/field-restrictions`
 * inside a try/catch so the declaration degrades to a no-op when the access
 * plugin is not installed.
 */
export function declareRestrictedFields(input: RestrictedFieldsDeclaration): void {
	if (!input.prefix.startsWith('/')) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `declareRestrictedFields: prefix "${input.prefix}" must start with "/".`)
	}

	for (const field of input.fields) {
		if (!field || /[.\s]/.test(field) || /^[-+*]/.test(field)) {
			// A dotted entry would never match: enforcement compares SEGMENTS of
			// requested paths, mirroring core's RestrictedFieldFilter. Failing fast
			// beats a declaration that silently protects nothing.
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`declareRestrictedFields: "${field}" is not a field segment. Declare single segments without ".", whitespace, or a leading "-", "+", "*" (e.g. "customer_tags", not "customer.customer_tags").`
			)
		}
	}

	const prefix = normalizePath(input.prefix)
	let segments = global.AccessRestrictedFields!.get(prefix)
	if (!segments) {
		segments = new Set()
		global.AccessRestrictedFields!.set(prefix, segments)
	}
	for (const field of input.fields) {
		segments.add(field)
	}
}

/**
 * The union of declared restricted-field segments applying to a request path:
 * every declaration whose prefix matches the path on a segment boundary.
 * Read per-request by the enforcement middleware.
 */
export function restrictedFieldsForPath(path: string): Set<string> {
	const candidate = normalizePath(path)
	const applicable = new Set<string>()

	for (const [prefix, segments] of global.AccessRestrictedFields ?? []) {
		if (matchesPrefixOnSegmentBoundary(candidate, prefix)) {
			for (const segment of segments) {
				applicable.add(segment)
			}
		}
	}

	return applicable
}
