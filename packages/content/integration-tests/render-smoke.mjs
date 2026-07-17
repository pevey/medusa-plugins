// Real-Node render-correctness check for renderMarkdown.
//
// The remark/rehype/shiki pipeline is ESM-only and cannot run under the Jest
// integration harness (experimental-vm-modules can't link the nested ESM tree),
// so md→HTML correctness is verified here instead, against the BUILT plugin
// module in real Node. Run via `yarn test:render` (which builds first).
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const modPath = resolve('.medusa/server/src/lib/markdown.js')
const mod = await import(pathToFileURL(modPath).href)
const renderMarkdown = mod.renderMarkdown ?? mod.default?.renderMarkdown
if (typeof renderMarkdown !== 'function') {
	console.error(`FAIL: renderMarkdown not found in ${modPath} (run the build first)`)
	process.exit(1)
}

const md = [
	'# Title',
	'',
	'Visit [example](https://example.com).',
	'',
	'| A | B |',
	'| - | - |',
	'| 1 | 2 |',
	'',
	'```ts',
	'const x: number = 1',
	'```',
	'',
	'<script>alert(1)</script>'
].join('\n')

const html = await renderMarkdown(md)
const empty = await renderMarkdown('')

const checks = {
	'renders h1 (CommonMark)': html.includes('<h1>Title</h1>'),
	'renders GFM table': html.includes('<table>'),
	'hardens external links (rel)': html.includes('rel="nofollow noopener noreferrer"'),
	'highlights code (shiki class)': html.includes('class="shiki'),
	'emits shiki CSS variables': html.includes('--shiki-light') || html.includes('--shiki-dark'),
	'sanitizes raw <script>': !html.includes('<script>'),
	'empty input yields empty string': empty === ''
}

let ok = true
for (const [name, pass] of Object.entries(checks)) {
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`)
	if (!pass) ok = false
}
console.log(ok ? '\nALL RENDER CHECKS PASSED' : '\nRENDER CHECKS FAILED')
process.exit(ok ? 0 : 1)
