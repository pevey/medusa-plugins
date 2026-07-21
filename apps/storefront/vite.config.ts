import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// kit 3.0.0-next: config is passed (flattened) to the `sveltekit(...)` plugin —
// there is no `svelte.config.js` and no `kit:` wrapper.
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
			alias: {
				'$src/*': 'src/*',
				$lib: 'src/lib'
			},
			// This is a reference/dev app; a prerender function (e.g. getRegions) that can't
			// reach the backend at build time should warn, not fail the build (so it never
			// blocks publishing the package).
			prerender: {
				handleHttpError: 'warn'
			}
		})
	],
	// In this monorepo the workspace library ships its own build-time copy of
	// @sveltejs/kit and svelte. Dedupe so the app and the library share ONE
	// instance — otherwise `invalid()` thrown from the library isn't recognized
	// by the app's form runtime (cross-realm `instanceof`). A real published
	// consumer never installs the library's devDeps, so it wouldn't hit this.
	resolve: { dedupe: ['@sveltejs/kit', 'svelte'] },
	optimizeDeps: {
		include: ['qs'], // needed for shadcn-svelte
		exclude: ['sveltekit-medusa-sdk'] // don't prebundle to prevent SvelteKit from dropping the remote functions in installed packages
	},
	ssr: {
		noExternal: ['sveltekit-medusa-sdk', 'cookie'] // treat the package as internal to the app so that $app/server can resolve
	}
})
