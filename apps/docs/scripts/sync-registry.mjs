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
//
// Why the dependency normalization step: `shadcn-svelte registry build` AUTO-DETECTS each item's
// imports and stamps the version it finds in packages/sveltekit-ui/package.json. That keeps npm
// deps single-sourced (never hand-written in registry.json — which would drift on the next Medusa
// bump), but it also stamps our workspace-linked packages verbatim as `pkg@workspace:*`, which no
// consumer can install. So we rewrite protocol specifiers to a real range and then FAIL the build
// on anything left that a consumer could not `npm install`, plus on any @medusajs/* version that
// has drifted from the Medusa release this repo builds against.

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
	if (!site) throw new Error('[sync-registry] Could not resolve a base URL (no REGISTRY_BASE_URL and no `site` in astro.config.mjs).')
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

// 2b. Version sources for the npm dependency normalization/guards below.
const readJson = path => JSON.parse(readFileSync(path, 'utf-8'))
const repoRoot = resolve(docsRoot, '../..')
// The Medusa release this repo builds against — every @medusajs/* pin lives at the root.
const medusaVersion = readJson(join(repoRoot, 'package.json')).devDependencies?.['@medusajs/medusa']
if (!medusaVersion) throw new Error('[sync-registry] Could not read @medusajs/medusa from the root package.json.')
// Our own workspace packages: `workspace:*` in the ui package.json must become something a
// consumer can install. Prefer the compat range the ui package already declares as a peer;
// fall back to a caret on the version we would publish.
const uiPkgJson = readJson(join(uiPkg, 'package.json'))
const workspaceRanges = new Map()
for (const dir of readdirSync(join(repoRoot, 'packages'))) {
	let pkg
	try {
		pkg = readJson(join(repoRoot, 'packages', dir, 'package.json'))
	} catch {
		continue
	}
	if (pkg.name && pkg.version) {
		workspaceRanges.set(pkg.name, uiPkgJson.peerDependencies?.[pkg.name] ?? `^${pkg.version}`)
	}
}

const PROTOCOL = /^(workspace|link|file|portal|patch):/
// "name", "name@spec", "@scope/name@spec" — the version delimiter is the LAST @ past position 0.
const splitDep = dep => {
	const at = dep.lastIndexOf('@')
	return at > 0 ? [dep.slice(0, at), dep.slice(at + 1)] : [dep, '']
}

const normalizeDep = (dep, item) => {
	const [name, spec] = splitDep(dep)
	if (PROTOCOL.test(spec)) {
		const range = workspaceRanges.get(name)
		if (!range)
			throw new Error(
				`[sync-registry] ${item}: dependency "${dep}" uses a non-installable specifier and ` +
					`"${name}" is not a workspace package, so no published range can be derived.`
			)
		return `${name}@${range}`
	}
	// The Medusa-version invariant: sveltekit-medusa-ui is versioned against a Medusa release, so a
	// stamped @medusajs/* pin that no longer matches the root pin means the ui package.json went
	// stale during an upgrade. Fail loudly instead of publishing a mismatched registry.
	if (name.startsWith('@medusajs/') && spec && spec !== medusaVersion)
		throw new Error(
			`[sync-registry] ${item}: "${dep}" does not match the Medusa version this repo builds ` +
				`against (${medusaVersion}). Update "${name}" in packages/sveltekit-ui/package.json.`
		)
	return dep
}

// Why the dedupe step: `registry build` stamps EVERY detected import into devDependencies, so any
// package also named in registry.json's hand-written `dependencies` ends up in both arrays. The
// shadcn-svelte CLI unions each array across the items being installed and runs `add <pkgs>` then
// `add -D <pkgs>` — with a package.json snapshot taken before either runs, so nothing reconciles
// them. Yarn then rejects the second command ("already listed as a regular dependency") and the CLI
// exits, AFTER writing the component files, silently skipping every remaining devDependency.
// Dependencies win, matching the order the CLI installs in.
const dedupeDevDeps = node => {
	if (!Array.isArray(node?.dependencies) || !Array.isArray(node?.devDependencies)) return
	const prod = new Set(node.dependencies.map(dep => splitDep(dep)[0]))
	node.devDependencies = node.devDependencies.filter(dep => !prod.has(splitDep(dep)[0]))
	if (node.devDependencies.length === 0) delete node.devDependencies
}

const rewriteDeps = node => {
	if (Array.isArray(node?.registryDependencies)) {
		node.registryDependencies = node.registryDependencies.map(toFullUrl)
	}
	for (const key of ['dependencies', 'devDependencies']) {
		if (Array.isArray(node?.[key])) {
			node[key] = node[key].map(dep => normalizeDep(dep, `${node.name ?? 'index'}.${key}`))
		}
	}
	dedupeDevDeps(node)
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
