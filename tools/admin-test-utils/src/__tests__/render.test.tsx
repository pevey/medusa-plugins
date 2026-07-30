import { describe, it, expect } from 'vitest'
import { page } from 'vitest/browser'
import { useNavigate } from 'react-router-dom'
import { renderAdminRoute } from '../render.js'

const Probe = () => {
	const navigate = useNavigate()
	return (
		<button type="button" onClick={() => navigate('/reviews/rev_1')}>
			Go
		</button>
	)
}

describe('renderAdminRoute', () => {
	it('renders a component inside a data router', async () => {
		renderAdminRoute(Probe)
		await expect.element(page.getByText('Go')).toBeInTheDocument()
	})

	it('records navigations so route changes are assertable', async () => {
		const result = renderAdminRoute(Probe)
		await page.getByText('Go').click()
		expect(result.navigations).toContain('/reviews/rev_1')
	})
})
