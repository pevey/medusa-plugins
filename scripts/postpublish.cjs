#!/usr/bin/env node
/**
 * Undoes the two edits Lerna leaves in the working tree after `lerna publish`.
 *
 * 1. `gitHead` — the commit a version was published from. Lerna injects it before packing and
 *    is meant to strip it again; with `from-package` it regularly doesn't. Nothing reads it at
 *    install time, and it is wrong for the `sveltekit-*` submodules anyway (Lerna resolves HEAD
 *    from the top-level repo, so they record a monorepo SHA, not one from their own history).
 *
 * 2. `workspace:*` → a concrete version. Correct in the published tarball, wrong in the repo:
 *    committed, it breaks local cross-package development.
 *
 * The workspace fix is driven by git rather than by inference: a dependency is restored only
 * when HEAD says `workspace:…` and the working tree disagrees. That reverts exactly what the
 * publish rewrote and cannot invent a change — peer ranges that are deliberately pinned to a
 * published version stay untouched, because HEAD doesn't call them workspace deps.
 *
 * Run as `yarn postpublish`; also chained onto `yarn release` / `yarn release:preview`.
 * Safe to run at any time — with a clean tree it does nothing.
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const WORKSPACE_DIRS = ['packages', 'apps', 'tools']
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

/** Indentation of the file, so rewriting doesn't reformat it. Falls back to a tab. */
function detectIndent(text) {
	const m = text.split('\n')[1]?.match(/^([ \t]+)/)
	return m ? m[1] : '\t'
}

function manifests() {
	const out = [path.join(ROOT, 'package.json')]
	for (const dir of WORKSPACE_DIRS) {
		const base = path.join(ROOT, dir)
		if (!fs.existsSync(base)) continue
		for (const entry of fs.readdirSync(base).sort()) {
			const file = path.join(base, entry, 'package.json')
			if (fs.existsSync(file)) out.push(file)
		}
	}
	return out
}

/**
 * Nearest enclosing git repo. The `sveltekit-*` packages are submodules with their own
 * histories, so their HEAD must be read from the submodule, not from the monorepo.
 */
function repoRootFor(file) {
	let dir = path.dirname(file)
	while (true) {
		if (fs.existsSync(path.join(dir, '.git'))) return dir
		const parent = path.dirname(dir)
		if (parent === dir) return null
		dir = parent
	}
}

/** The committed version of a manifest, or null when it isn't tracked. */
function committedManifest(file) {
	const repo = repoRootFor(file)
	if (!repo) return null
	const rel = path.relative(repo, file).split(path.sep).join('/')
	try {
		return JSON.parse(execFileSync('git', ['show', `HEAD:${rel}`], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
	} catch {
		return null
	}
}

let changed = 0
for (const file of manifests()) {
	const text = fs.readFileSync(file, 'utf8')
	const pkg = JSON.parse(text)
	const rel = path.relative(ROOT, file)
	const fixes = []

	if (pkg.gitHead !== undefined) {
		delete pkg.gitHead
		fixes.push('gitHead')
	}

	const head = committedManifest(file)
	if (head) {
		for (const section of DEP_SECTIONS) {
			const headDeps = head[section]
			const deps = pkg[section]
			if (!headDeps || !deps) continue
			for (const [name, headRange] of Object.entries(headDeps)) {
				if (typeof headRange !== 'string' || !headRange.startsWith('workspace:')) continue
				if (deps[name] === undefined || deps[name] === headRange) continue
				fixes.push(`${section}.${name}: ${deps[name]} → ${headRange}`)
				deps[name] = headRange
			}
		}
	}

	if (!fixes.length) continue

	const trailingNewline = text.endsWith('\n') ? '\n' : ''
	fs.writeFileSync(file, JSON.stringify(pkg, null, detectIndent(text)) + trailingNewline)
	console.log(`${rel}\n  ${fixes.join('\n  ')}`)
	changed++
}

console.log(changed ? `\n${changed} manifest(s) cleaned.` : 'Nothing to clean.')
