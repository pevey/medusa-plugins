import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
	plugins: [react()],
	test: {
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		exclude: ['src/__tests__/node/**'],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: 'chromium', headless: true }]
		}
	}
})
