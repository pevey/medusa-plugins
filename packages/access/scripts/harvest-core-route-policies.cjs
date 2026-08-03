/**
 * Harvest the `policies:[]` declarations from the installed @medusajs/medusa
 * core admin route middlewares.
 *
 * Split out from the generator so the sync test can run the same harvest
 * in-memory and compare it against the checked-in file — the generator writes,
 * this only reads, and both see identical data.
 */
const fs = require('fs')
const path = require('path')

const MEDUSA_ROOT = path.resolve(__dirname, '../../../node_modules/@medusajs/medusa')

function walk(dir) {
	let out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			out = out.concat(walk(full))
		} else if (entry.name === 'middlewares.js') {
			out.push(full)
		}
	}
	return out
}

function installedVersion() {
	return require(path.join(MEDUSA_ROOT, 'package.json')).version
}

/**
 * @returns {{ version: string, entries: object[] }}
 * @throws when core no longer exposes `policies` on its route declarations —
 *   the expected shape of core dropping its RBAC feature flags. Failing loudly
 *   beats emitting an empty map that reads as "nothing to gate".
 */
function harvest() {
	const base = path.join(MEDUSA_ROOT, 'dist/api/admin')
	const seen = new Set()
	const entries = []

	for (const file of walk(base).sort()) {
		const mod = require(file)
		for (const value of Object.values(mod)) {
			if (!Array.isArray(value)) continue
			for (const route of value) {
				if (!route || !route.policies || typeof route.matcher !== 'string') continue
				const methods = route.methods || (route.method ? (Array.isArray(route.method) ? route.method : [route.method]) : undefined)
				const policies = (Array.isArray(route.policies) ? route.policies : [route.policies]).map(p => ({ resource: p.resource, operation: p.operation }))
				const entry = { matcher: route.matcher, ...(methods ? { methods } : {}), policies }
				const key = JSON.stringify(entry)
				if (seen.has(key)) continue
				seen.add(key)
				entries.push(entry)
			}
		}
	}

	if (!entries.length) {
		throw new Error(
			`[access] harvested 0 core route policies from @medusajs/medusa@${installedVersion()}. ` +
				'Core no longer exposes `policies` on its admin route declarations — the pinned map cannot be regenerated ' +
				'from this version, and the checked-in map is now the only source of core route gating.'
		)
	}

	return { version: installedVersion(), entries }
}

/** Stable, order- and formatting-independent key for one entry. */
function canonicalKey(entry) {
	const methods = [...(entry.methods ?? [])].sort()
	const policies = entry.policies.map(p => `${p.resource}:${(Array.isArray(p.operation) ? [...p.operation].sort() : [p.operation]).join('|')}`).sort()
	return `${entry.matcher} [${methods.join(',')}] ${policies.join(' ')}`
}

module.exports = { harvest, canonicalKey, installedVersion }
