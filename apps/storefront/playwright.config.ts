import { defineConfig } from '@playwright/test'

// End-to-end tests run against the real storefront + Medusa backend.
//
// PREREQUISITE: the Medusa backend must be running (cd apps/backend && yarn dev),
// because the /gallery-demo route calls getProduct({ slug: 'test' }) which hits it.
// Playwright starts the storefront itself (or reuses one already running on 5180).
export default defineConfig({
	testDir: 'e2e',
	use: { baseURL: 'http://localhost:5180' },
	webServer: {
		command: 'yarn dev',
		port: 5180,
		reuseExistingServer: true,
		timeout: 120_000
	}
})
