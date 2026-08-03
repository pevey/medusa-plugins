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
}

export const coreRoutePolicies: CoreRoutePolicy[] = `

fs.writeFileSync(target, header + JSON.stringify(entries, null, 2) + '\n')

try {
	execFileSync('npx', ['prettier', '--write', target], { cwd: path.resolve(__dirname, '../../..'), stdio: 'inherit' })
} catch {
	console.warn('[access] prettier failed — the file is written but unformatted; run prettier on it before committing.')
}

console.log(`wrote ${entries.length} core route policy entries from @medusajs/medusa@${version}`)
