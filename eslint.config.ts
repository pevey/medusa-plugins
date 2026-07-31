import { defineConfig } from 'eslint/config'
import medusa from '@medusajs/eslint-plugin'

// The Medusa preset globally ignores every test file (`**/__tests__/**`, `**/*.test.*`,
// `**/*.spec.*`). That is the right default for the backend plugins, but it also means no
// rule can ever reach the sveltekit-ui component tests. Strip those three patterns here and
// re-apply them below with a carve-out, so the ignore stays in force everywhere else.
const TEST_IGNORES = ['**/__tests__/**', '**/*.spec.*', '**/*.test.*']

const recommended = medusa.configs.recommended.map(config =>
	config.ignores && !config.files ? { ...config, ignores: config.ignores.filter(pattern => !TEST_IGNORES.includes(pattern)) } : config
)

export default defineConfig([
	...recommended,
	{
		// Re-ignore all test files except the sveltekit-ui component tests.
		ignores: [...TEST_IGNORES, '!packages/sveltekit-ui/src/**/__tests__/**']
	},
	{
		// `render()` from vitest-browser-svelte@3 is async — it resolves to the RenderResult.
		// Calling it without `await` still mounts the component (the underlying coreRender is
		// synchronous), so assertions appear to work, but you hold a Promise instead of the
		// result: no `rerender`, `unmount`, `component`, or bound query helpers, plus a
		// floating trace-mark promise. Easy to reintroduce and invisible until you need the
		// return value.
		files: ['packages/sveltekit-ui/src/**/__tests__/**/*.ts'],
		rules: {
			// The carve-out above exists only to enable the rule below, so silence the
			// backend-oriented Medusa rules it also lets through. `@medusajs/framework/types`
			// is a server package that a storefront must not import, and the price heuristic
			// fires on test fixture literals.
			'@medusajs/import-from-framework-not-internal': 'off',
			'@medusajs/prices-in-major-units': 'off',
			'no-restricted-syntax': [
				'error',
				{
					selector: "ExpressionStatement > CallExpression[callee.name='render']",
					message: 'await render(...) — render() is async in vitest-browser-svelte@3.'
				},
				{
					selector: "VariableDeclarator > CallExpression[callee.name='render']",
					message: 'await render(...) — render() is async in vitest-browser-svelte@3.'
				}
			]
		}
	}
])
