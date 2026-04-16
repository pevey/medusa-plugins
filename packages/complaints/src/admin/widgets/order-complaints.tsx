import { Container, Heading, Text, Button, Badge } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminOrder } from '@medusajs/framework/types'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from 'react-router-dom'
import { sdk } from '../lib/sdk'
import { AdminComplaintsResponse } from '../types'

export const config = defineWidgetConfig({
	zone: 'order.details.side.before'
})

const OrderComplaintsWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
	const navigate = useNavigate()

	const { data, isLoading } = useQuery<AdminComplaintsResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/complaints`, {
				query: {
					order_id: order.id,
					fields: 'id,number,status,description',
					limit: 10
				}
			}),
		queryKey: ['complaints', 'order', order.id]
	})

	const complaints = data?.complaints ?? []

	const truncate = (text: string, maxLength = 100) =>
		text.length > maxLength ? `${text.slice(0, maxLength)}...` : text

	return (
		<>
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Complaints</Heading>
					<Button
						size="small"
						variant="secondary"
						onClick={() =>
							navigate(
								`/complaints/create?order_id=${order.id}&customer_id=${order.customer_id}`
							)
						}
					>
						Create Complaint
					</Button>
				</div>

				{isLoading ? (
					<div className="px-6 py-4">
						<Text size="small">Loading...</Text>
					</div>
				) : complaints.length > 0 ? (
					complaints.map(complaint => (
						<div
							key={complaint.id}
							className="flex items-start justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-ui-bg-subtle"
							onClick={() => navigate(`/complaints/${complaint.id}`)}
						>
							<div className="flex flex-col gap-1">
								<Text size="small" weight="plus">
									#{complaint.number}
								</Text>
								<Text size="small" className="text-ui-fg-subtle">
									{truncate(complaint.description)}
								</Text>
							</div>
							<Badge size="xsmall" color={complaint.status === 'open' ? 'orange' : 'grey'}>
								{complaint.status}
							</Badge>
						</div>
					))
				) : (
					<div className="px-6 py-4">
						<Text size="small" className="text-ui-fg-subtle">
							No complaints for this order.
						</Text>
					</div>
				)}
			</Container>
			<Outlet />
		</>
	)
}

export default OrderComplaintsWidget
