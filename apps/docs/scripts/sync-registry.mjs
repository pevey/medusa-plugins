// Builds the sveltekit-medusa-ui shadcn registry and stages it into the docs site's static
// output so it deploys alongside the docs (served at `<site>/r/<name>.json`).
//
// Why the rewrite step: shadcn-svelte resolves BARE-name registryDependencies (e.g. "button")
// against the OFFICIAL registry. Our own items referenced by bare name (image-zoom, product, …)
// would therefore fail to resolve for a consumer installing from our hosted registry. So we
// rewrite every dependency that is one of OUR items into a full URL, and leave official
// components bare. registry.json itself stays domain-free (bare names); only the built, served
// artifacts under public/r carry the absolute URLs — and public/r is gitignored.
//
// Base URL: REGISTRY_BASE_URL env override, else the docs `site` (astro.config.mjs) + "/r",
// so the domain has a single source of truth and is never duplicated in committed source.

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(scriptsDir, '..')
const uiPkg = resolve(docsRoot, '../../packages/sveltekit-ui')
const builtDir = join(uiPkg, '.registry')
const outDir = join(docsRoot, 'public', 'r')

function resolveBaseUrl() {
	if (process.env.REGISTRY_BASE_URL) return process.env.REGISTRY_BASE_URL.replace(/\/+$/, '')
	const cfg = readFileSync(join(docsRoot, 'astro.config.mjs'), 'utf-8')
	const site = cfg.match(/site:\s*['"]([^'"]+)['"]/)?.[1]
	if (!site)
		throw new Error(
			'[sync-registry] Could not resolve a base URL (no REGISTRY_BASE_URL and no `site` in astro.config.mjs).'
		)
	return `${site.replace(/\/+$/, '')}/r`
}

const base = resolveBaseUrl()

// 1. Build the registry fresh from the package (writes bare-name JSON to static/r).
execSync('yarn registry:build', { cwd: uiPkg, stdio: 'inherit' })

// 2. Our own item names — any dependency matching one of these becomes a full URL. Also the set
//    of files we stage, so stale build outputs (retired components) never leak into the deploy.
const registry = JSON.parse(readFileSync(join(uiPkg, 'registry.json'), 'utf-8'))
const ownNames = new Set(registry.items.map(item => item.name))
const allowedFiles = new Set([...ownNames].map(name => `${name}.json`).concat('index.json'))

const toFullUrl = dep => (ownNames.has(dep) ? `${base}/${dep}.json` : dep)
const rewriteDeps = node => {
	if (Array.isArray(node?.registryDependencies)) {
		node.registryDependencies = node.registryDependencies.map(toFullUrl)
	}
}

// 3. Copy each built JSON into public/r, rewriting internal deps to absolute URLs.
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

let count = 0
for (const file of readdirSync(builtDir)) {
	if (!allowedFiles.has(file)) continue
	const doc = JSON.parse(readFileSync(join(builtDir, file), 'utf-8'))
	// index.json is a top-level array of entries; item files are objects. Rewrite deps in both,
	// plus any nested `items` array, so every dependency reference stays consistent.
	if (Array.isArray(doc)) doc.forEach(rewriteDeps)
	else {
		rewriteDeps(doc)
		if (Array.isArray(doc.items)) doc.items.forEach(rewriteDeps)
	}
	writeFileSync(join(outDir, file), `${JSON.stringify(doc, null, 2)}\n`)
	count++
}

console.log(`[sync-registry] staged ${count} registry files to public/r (base: ${base})`)
