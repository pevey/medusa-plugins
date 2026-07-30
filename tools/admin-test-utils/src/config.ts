import { fileURLToPath } from 'node:url'
// `ViteUserConfig`, not `UserConfig`: vitest 4 re-exports Vite's config type under the aliased
// name (`export { UserConfig as ViteUserConfig }`), so importing `UserConfig` from 'vitest/config'
// resolves to nothing and only shows up once a consumer typechecks a file that reaches this one.
import { defineConfig, type ViteUserConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

const shim = (name: string) => fileURLToPath(new URL(`./shims/${name}.ts`, import.meta.url))

export type AdminTestConfigOptions = {
	/** The consuming plugin's package root — pass `import.meta.dirname`. */
	root: string
	/** Extra aliases for plugin-specific node-only imports (e.g. content's `multer`). */
	alias?: Array<{ find: string | RegExp; replacement: string }>
}

export function defineAdminTestConfig(options: AdminTestConfigOptions): ViteUserConfig {
	return defineConfig({
		plugins: [react()],
		resolve: {
			// One copy of each context-carrying library, always. The harness supplies the
			// QueryClientProvider and the router while the plugin's own hooks consume them;
			// a second instance of either means the provider and the consumer read different
			// module-level contexts and every hook throws "No QueryClient set".
			dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom', '@medusajs/ui'],
			alias: [
				// Order matters: Vite matches first-to-last, so the specific framework
				// subpaths must precede any broader pattern a caller adds.
				{ find: '@medusajs/framework/http', replacement: shim('framework-http') },
				{
					find: '@medusajs/medusa/api/utils/validators',
					replacement: shim('medusa-validators')
				},
				// `@medusajs/framework/zod` is a re-export of zod; alias it so importing a
				// plugin's validators does not drag framework internals into the browser bundle.
				{ find: '@medusajs/framework/zod', replacement: 'zod' },
				...(options.alias ?? [])
			]
		},
		test: {
			root: options.root,
			include: ['src/admin/__tests__/**/*.test.{ts,tsx}'],
			browser: {
				enabled: true,
				provider: playwright(),
				instances: [{ browser: 'chromium', headless: true }]
			}
		}
	})
}
