import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { plugins, otherReadmePackages } from '../docs-packages.mjs'

const here = dirname(fileURLToPath(import.meta.url)) // apps/docs/scripts
const docsRoot = resolve(here, '..')                 // apps/docs
const repoRoot = resolve(here, '../../..')           // repo root

// Every docs package that declares a `dir` has its Overview page generated from
// that package's README.md (the single source of truth). See docs-packages.mjs.
const targets = [...plugins, ...otherReadmePackages].filter(p => p.dir)

// Clean a README into page body. Starlight renders the frontmatter `title` as
// the page H1, so drop top-level `# ...` headings to avoid a duplicate title;
// also drop self-referential `[Documentation]` links and a known boilerplate
// line, and collapse blank-line runs. (Ported from the old generate-openapi
// README sync so output stays consistent with the existing plugin pages.)
function cleanReadmeBody(md) {
	return md
		.split('\n')
		.filter(
			line =>
				!/^#\s+/.test(line) &&
				!/^\[Documentation\]/.test(line) &&
				!line.includes('not familiar with Medusa')
		)
		.join('\n')
		.replace(/^\n+/, '')
		.replace(/\n{3,}/g, '\n\n')
}

function yamlQuote(s) {
	return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

for (const { dir, slug, label } of targets) {
	const pkgDir = resolve(repoRoot, 'packages', dir)
	const readmePath = resolve(pkgDir, 'README.md')

	// Guard: a MISSING README is a hard error — most often an uninitialized
	// submodule (or a misconfigured `dir`). Fail loud with a fix hint.
	if (!existsSync(readmePath)) {
		console.error(
			`\n[sync-readmes] README not found: ${readmePath}\n` +
				`  Package "${dir}" (docs slug "${slug}") is not checked out or has no README.\n` +
				`  If it is a git submodule, run: git submodule update --init\n`
		)
		process.exit(1)
	}

	const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'))
	let body = cleanReadmeBody(readFileSync(readmePath, 'utf-8'))

	// An EMPTY README is a soft warning — treat it as an intentional placeholder
	// and fall back to a description-only page so the build still succeeds and the
	// page auto-expands once the README is written.
	if (body.trim() === '') {
		console.warn(
			`[sync-readmes] warning: packages/${dir}/README.md is empty — ` +
				`generating a description-only page for "${slug}" until it is written.`
		)
		body = `${pkg.description || 'Documentation coming soon.'}\n`
	}

	const title = label || slug
	const frontmatter = [
		'---',
		`title: ${yamlQuote(title)}`,
		`description: ${yamlQuote(pkg.description || title)}`,
		'prev: false',
		'---',
		''
	].join('\n')

	const outDir = resolve(docsRoot, 'src/content/docs', slug)
	mkdirSync(outDir, { recursive: true })
	writeFileSync(resolve(outDir, 'index.md'), frontmatter + body)
	console.log(`synced ${dir}/README.md -> src/content/docs/${slug}/index.md`)
}
