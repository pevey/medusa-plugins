import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminProduct } from '@medusajs/framework/types'
import { clx, Container, Heading, Text } from '@medusajs/ui'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { sdk } from '../lib/sdk'
import { ComplaintProductStat } from '../types'

export const config = defineWidgetConfig({
	zone: 'product.details.side.before'
})

const ProductComplaintsWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
	const { data: statsResult } = useQuery<{
		complaint_product_stat: ComplaintProductStat
	}>({
		queryFn: () =>
			sdk.client.fetch(`/admin/complaint-stats/products/${product.id}`, {
				query: {
					fields: 'product_id,total_orders,total_complaints,complaint_rate,last_calculated_at'
				}
			}),
		queryKey: ['complaint-product-stat', product.id]
	})
	const stat = statsResult?.complaint_product_stat
	const complaintCount = stat?.total_complaints
	const complaintRate = stat?.complaint_rate ?? 0
	const complaintRatePercent = (complaintRate * 100).toFixed(2)

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Complaint Stats</Heading>
			</div>

			{/* Complaint Rate */}
			<div className={clx('text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4')}>
				<Text size="small" weight="plus" leading="compact">
					Complaint Rate
				</Text>
				<Text size="small" leading="compact">
					{complaintRatePercent}%
				</Text>
			</div>

			{/* Total Complaints */}
			<div className={clx('text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4')}>
				<Text size="small" weight="plus" leading="compact">
					Total Complaints
				</Text>
				<Text size="small" leading="compact">
					{stat?.total_complaints ?? complaintCount}
				</Text>
			</div>

			{/* Total Orders */}
			<div className={clx('text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4')}>
				<Text size="small" weight="plus" leading="compact">
					Total Orders
				</Text>
				<Text size="small" leading="compact">
					{stat?.total_orders ?? '-'}
				</Text>
			</div>

			{/* Last Calculated */}
			{stat?.last_calculated_at && (
				<div className={clx('text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4')}>
					<Text size="small" weight="plus" leading="compact">
						Last Updated
					</Text>
					<Text size="small" leading="compact">
						{new Date(stat.last_calculated_at).toLocaleDateString()}
					</Text>
				</div>
			)}

			{/* Link to filtered complaints list */}
			<div className="px-6 py-4">
				<Link
					to={`/complaints?product_id=${product.id}`}
					className="text-ui-fg-interactive text-sm hover:underline"
				>
					View all complaints for this product →
				</Link>
			</div>
		</Container>
	)
}

export default ProductComplaintsWidget
