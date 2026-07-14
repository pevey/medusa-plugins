import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: { experimental: { async: true } },
	kit: {
		adapter: adapter(),
		experimental: { remoteFunctions: true },
		// This is a reference/dev app; a prerender function (e.g. getRegions) that can't
		// reach the backend at build time should warn, not fail the build (so it never
		// blocks publishing the package).
		prerender: { handleHttpError: 'warn' }
	}
}
export default config
