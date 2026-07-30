import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminProduct } from '@medusajs/framework/types'
import { Container, Heading, Text } from '@medusajs/ui'
import { useQuery } from '@tanstack/react-query'

/**
 * REFERENCE — Usage Pattern A (UI side): a permission-gated widget defined at
 * the backend-project level. Renders a panel on the product detail page ONLY
 * for admins whose roles grant `content:read` (the resource gated in
 * `src/api/middlewares.ts`); everyone else sees a blank zone. Because the
 * content API is also guarded server-side, the data stays protected regardless
 * of what the UI does.
 *
 * Note: even at the project level a *widget* still gates via the
 * `/admin/access/me/permissions` route — a widget is compiled into the browser
 * bundle and cannot import the server-side policy utilities. This example
 * assumes access IS installed and does not guard the fetch; contrast with
 * `packages/complaints/src/admin/widgets/customer-complaints.tsx`, which wraps
 * the fetch in try/catch so it degrades gracefully when access is absent.
 */
const ProductContentAccessWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
	const { data } = useQuery({
		queryKey: ['access-me-permissions'],
		queryFn: async (): Promise<{ permissions: string[] }> => {
			const res = await fetch('/admin/access/me/permissions', {
				credentials: 'include'
			})
			return res.json()
		}
	})

	if (!data?.permissions?.includes('content:read')) {
		return null
	}

	return (
		<Container className="p-6">
			<Heading level="h2">Content</Heading>
			<Text className="text-ui-fg-subtle" size="small">
				You have permission to view content for product {product.id}.
			</Text>
		</Container>
	)
}

export const config = defineWidgetConfig({
	zone: 'product.details.after'
})

export default ProductContentAccessWidget
