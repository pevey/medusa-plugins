#!/usr/bin/env node
/**
 * Regenerate src/access-policies/core-route-policies.ts from the installed
 * @medusajs/medusa core admin route middlewares.
 *
 * Run from anywhere: `node packages/access/scripts/gen-core-route-policies.cjs`
 *
 * The emitted file records the Medusa version it came from, and is formatted
 * with the repo's prettier config so a regeneration diff is signal rather than
 * a whitespace storm. `core-route-policies.sync.unit.spec.ts` fails if the
 * checked-in file drifts from what this would emit.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { harvest } = require('./harvest-core-route-policies.cjs')

const { version, entries } = harvest()

const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Derive which row a mutating entry targets, so the request guard can perform
 * the scope assertion on the route's behalf (core handlers never call
 * assertScope). Conservative and mechanical:
 *
 * - the entry's policies must all name ONE resource — a multi-resource entry
 *   gives no way to know which the path param identifies;
 * - the matcher must carry at least one `:param`; the FIRST is taken — core
 *   routes are uniformly `/admin/<collection>/:id[/...]`, and the first param
 *   is the row being mutated even on subtree routes
 *   (`/admin/orders/:id/fulfillments` mutates the order);
 * - only entries reachable by a mutating method get one — reads narrow via the
 *   query interceptor and need no assertion.
 *
 * A wrong derivation fails CLOSED: the guard fetches the id through the scope
 * filter, and an id that is not a row of the resource simply misses (404).
 * Entries this skips stay denied for scoped actors and are enumerated by the
 * boot report.
 */
function deriveTarget(entry) {
	const methods = entry.methods ?? MUTATING
	if (!methods.some(method => MUTATING.includes(method.toUpperCase()))) {
		return undefined
	}
	const resources = [...new Set(entry.policies.map(policy => policy.resource))]
	if (resources.length !== 1) {
		return undefined
	}
	const param = /:([A-Za-z0-9_]+)/.exec(entry.matcher)?.[1]
	if (!param) {
		return undefined
	}
	return { resource: resources[0], param }
}

for (const entry of entries) {
	const derived = deriveTarget(entry)
	if (derived) {
		entry.target = derived
	}
}

const target = path.resolve(__dirname, '../src/access-policies/core-route-policies.ts')

const header = `// AUTO-GENERATED — do not edit by hand.
//
// The \`policies:[]\` declarations @medusajs/medusa ships on its core admin
// routes, harvested from the installed package. ${entries.length} entries.
//
// Generated from @medusajs/medusa@${version}.
//
// Regenerate with scripts/gen-core-route-policies.cjs. Hand-written additions
// belong in supplemental-route-policies.ts, which this never overwrites.

export const CORE_ROUTE_POLICIES_MEDUSA_VERSION = '${version}'

type CoreRoutePolicy = {
	matcher: string
	methods?: string[]
	policies: { resource: string; operation: string | string[] }[]
	/** The row a mutating entry targets, for the guard-side scope assertion. */
	target?: { resource: string; param: string }
}

export const coreRoutePolicies: CoreRoutePolicy[] = `

fs.writeFileSync(target, header + JSON.stringify(entries, null, 2) + '\n')

try {
	execFileSync('npx', ['prettier', '--write', target], { cwd: path.resolve(__dirname, '../../..'), stdio: 'inherit' })
} catch {
	console.warn('[access] prettier failed — the file is written but unformatted; run prettier on it before committing.')
}

console.log(`wrote ${entries.length} core route policy entries from @medusajs/medusa@${version}`)
