import { test, expect } from '@playwright/test'

// Full-flow check: the demo route fetches the real `test` product (3 R2 images) via
// getProduct({ slug: 'test' }) and renders it through the compound Gallery.* API.
// Requires the Medusa backend running (see playwright.config.ts).

test.describe('gallery demo (/gallery-demo)', () => {
	test('renders the product gallery from the backend', async ({ page }) => {
		await page.goto('/gallery-demo')
		await expect(page.getByTestId('gallery-demo')).toBeVisible()
		// The main images use the product title ("test") as their alt text.
		await expect(page.getByRole('img', { name: /test/i }).first()).toBeVisible()
	})

	test('clicking a thumbnail marks it as the current image', async ({ page }) => {
		await page.goto('/gallery-demo')
		const thumb = page.getByTestId('gallery-bottom').getByRole('button', { name: 'View image 2' })
		await thumb.click()
		await expect(thumb).toHaveAttribute('aria-current', 'true')
	})

	test('zoom gallery opens the overlay when the main image is clicked', async ({ page }) => {
		await page.goto('/gallery-demo')
		await page.getByTestId('gallery-zoom').getByRole('img', { name: /test/i }).first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('pointer example: bound selected index tracks the selected image', async ({ page }) => {
		await page.goto('/gallery-demo')
		const readout = page.getByTestId('pointer-readout')
		await expect(readout).toContainText('Selected image: 1 /')
		await page.getByTestId('example-pointer').getByRole('button', { name: 'View image 2' }).click()
		await expect(readout).toContainText('Selected image: 2 /')
	})
})
