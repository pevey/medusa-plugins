// Markdown → sanitized, highlighted HTML for storefront rendering.
//
// The whole remark/rehype/shiki stack is ESM-only and this plugin compiles to
// CommonJS (Node 20 floor), so every dep is pulled in via dynamic import() the
// first time renderMarkdown runs, then the assembled processor is cached
// module-side. Ordering matters: rehype-sanitize runs on the parsed tree FIRST;
// Shiki adds its highlight spans AFTER, so highlighted output is inherently
// trusted and never sanitized away. Shiki's bundled rehype plugin manages its
// own singleton highlighter and lazy-loads languages as it encounters them.
//
// Bump RENDERER_VERSION whenever the pipeline, the Shiki themes, or the Shiki
// version changes — it is part of the render cache key, so bumping it abandons
// every previously cached rendering (renderings are derived, never persisted).
export const RENDERER_VERSION = 'md-1'

// Shiki dual-theme: token colors come from these (following the storefront's
// light/dark), while chrome (pre background, borders) is themed by the consuming
// component via shadcn CSS vars. `defaultColor: false` emits --shiki-light /
// --shiki-dark CSS variables instead of a single baked color.
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const

// Load the ESM-only deps at runtime. The Function() indirection keeps each call a
// NATIVE dynamic import: its body is an opaque string, so neither the plugin's CJS
// build (swc) nor the integration harness (@swc/jest) can rewrite it to require() —
// the real ESM modules load in both production and tests.
const esmImport: (specifier: string) => Promise<any> =
	new Function('s', 'return import(s)') as (specifier: string) => Promise<any>

type Processor = { process: (input: string) => Promise<{ toString(): string }> }
let processorPromise: Promise<Processor> | null = null

async function getProcessor(): Promise<Processor> {
	if (!processorPromise) {
		processorPromise = (async () => {
			const [
				{ unified },
				{ default: remarkParse },
				{ default: remarkGfm },
				{ default: remarkRehype },
				{ default: rehypeSanitize },
				{ default: rehypeStringify },
				{ default: rehypeShiki },
				{ visit }
			] = await Promise.all([
				esmImport('unified'),
				esmImport('remark-parse'),
				esmImport('remark-gfm'),
				esmImport('remark-rehype'),
				esmImport('rehype-sanitize'),
				esmImport('rehype-stringify'),
				esmImport('@shikijs/rehype'),
				esmImport('unist-util-visit')
			])

			// Harden links/images. Runs AFTER sanitize so these attrs survive.
			const rehypeHarden = () => (tree: unknown) => {
				visit(tree as any, 'element', (node: any) => {
					if (node.tagName === 'a') {
						const href = String(node.properties?.href ?? '')
						if (/^https?:\/\//i.test(href)) {
							node.properties.rel = 'nofollow noopener noreferrer'
							node.properties.target = '_blank'
						}
					}
					if (node.tagName === 'img') {
						node.properties = node.properties ?? {}
						node.properties.loading = 'lazy'
						node.properties.decoding = 'async'
					}
				})
			}

			return unified()
				.use(remarkParse)
				.use(remarkGfm)
				.use(remarkRehype)
				.use(rehypeSanitize)
				.use(rehypeHarden)
				.use(rehypeShiki, {
					themes: SHIKI_THEMES,
					defaultColor: false, // emit --shiki-light/--shiki-dark CSS vars, no baked color
					fallbackLanguage: 'text' // unknown/absent fence language must not throw
				})
				.use(rehypeStringify) as unknown as Processor
		})()
	}
	return processorPromise
}

export async function renderMarkdown(markdown: string): Promise<string> {
	if (!markdown) return ''
	const processor = await getProcessor()
	const file = await processor.process(markdown)
	return String(file)
}
