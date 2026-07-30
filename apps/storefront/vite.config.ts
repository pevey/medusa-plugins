import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			compilerOptions: {
				experimental: {
					async: true
				}
			},
			adapter: adapter(),
			experimental: {
				remoteFunctions: true
			},
			// `$lib` is not built into SvelteKit 3 — it only exists because of this alias.
			// TODO: migrate to package.json subpath imports (`#lib/*`) in lockstep with the
			// sveltekit-ui registry, which also emits `$lib/components/ui/*` references.
			alias: {
				$lib: 'src/lib'
			},
			prerender: {
				handleHttpError: 'warn'
			}
		})
	],
	// In a monorepo, dedupe @sveltejs/kit and svelteso `invalid()` thrown from the library isn't recognized by the app's form runtime (cross-realm `instanceof`). A real consumer never installs the library's devDeps, so dedupe not needed.
	resolve: { dedupe: ['@sveltejs/kit', 'svelte'] },
	optimizeDeps: {
		include: ['qs'] // needed for shadcn-svelte
	},
	ssr: {
		noExternal: ['sveltekit-medusa-sdk', 'cookie'] // treat the package as internal to the app so that $app/server can resolve
	},
	server: {
		allowedHosts: ['storefront.pevey.dev']
	}
})
