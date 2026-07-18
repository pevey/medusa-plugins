#!/usr/bin/env node
/**
 * Regenerate src/access-policies/core-route-policies.ts by harvesting the
 * `policies:[]` declarations from the pinned @medusajs/medusa core admin route
 * middlewares. Run from the repo root: `node packages/access/scripts/gen-core-route-policies.cjs`
 */
const fs = require("fs")
const path = require("path")

const base = path.resolve(
  __dirname,
  "../../../node_modules/@medusajs/medusa/dist/api/admin"
)

function walk(dir) {
  let out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out = out.concat(walk(p))
    else if (e.name === "middlewares.js") out.push(p)
  }
  return out
}

const seen = new Set()
const entries = []
for (const file of walk(base).sort()) {
  const mod = require(file)
  for (const value of Object.values(mod)) {
    if (!Array.isArray(value)) continue
    for (const route of value) {
      if (!route || !route.policies || typeof route.matcher !== "string") continue
      const methods =
        route.methods ||
        (route.method
          ? Array.isArray(route.method)
            ? route.method
            : [route.method]
          : undefined)
      const policies = (
        Array.isArray(route.policies) ? route.policies : [route.policies]
      ).map((p) => ({ resource: p.resource, operation: p.operation }))
      const entry = {
        matcher: route.matcher,
        ...(methods ? { methods } : {}),
        policies,
      }
      const key = JSON.stringify(entry)
      if (seen.has(key)) continue
      seen.add(key)
      entries.push(entry)
    }
  }
}

const header = `// AUTO-GENERATED from the pinned @medusajs/medusa core admin route policy
// declarations (the last-MIT snapshot). ${entries.length} entries. Regenerate with
// scripts/gen-core-route-policies.cjs if the pinned Medusa version changes. Feeds
// the access guard so core admin routes are gated with full parity.

type CoreRoutePolicy = {
  matcher: string
  methods?: string[]
  policies: { resource: string; operation: string | string[] }[]
}

export const coreRoutePolicies: CoreRoutePolicy[] = `

fs.writeFileSync(
  path.resolve(__dirname, "../src/access-policies/core-route-policies.ts"),
  header + JSON.stringify(entries, null, 2) + "\n"
)
console.log("wrote", entries.length, "core route policy entries")
