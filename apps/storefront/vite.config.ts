import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [sveltekit()],
	// In this monorepo the workspace library ships its own build-time copy of
	// @sveltejs/kit and svelte. Dedupe so the app and the library share ONE
	// instance — otherwise `invalid()` thrown from the library isn't recognized
	// by the app's form runtime (cross-realm `instanceof`). A real published
	// consumer never installs the library's devDeps, so it wouldn't hit this.
	resolve: { dedupe: ['@sveltejs/kit', 'svelte'] }
})
