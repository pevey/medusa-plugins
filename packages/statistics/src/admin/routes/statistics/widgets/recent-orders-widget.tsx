import { Link } from 'react-router-dom'
import { Badge, Container, Heading, Text } from '@medusajs/ui'
import { useRecentOrders } from '../../../hooks/statistics'
import type { WidgetProps } from './index'

const STATUS_COLORS: Record<string, 'green' | 'orange' | 'red' | 'grey' | 'blue'> = {
	completed: 'green',
	pending: 'orange',
	canceled: 'red',
	archived: 'grey',
	requires_action: 'blue'
}

export const RecentOrdersWidget = (_props: WidgetProps) => {
	const { data, isLoading } = useRecentOrders(8)
	const orders = data?.orders ?? []

	return (
		<Container className="flex h-full flex-col p-0">
			<div className="px-4 pt-4 pb-2">
				<Heading level="h3">Recent Orders</Heading>
			</div>
			<div className="flex-1 overflow-y-auto">
				{isLoading && (
					<Text size="small" className="text-ui-fg-muted px-4">
						Loading...
					</Text>
				)}
				{!isLoading && orders.length === 0 && (
					<Text size="small" className="text-ui-fg-muted px-4">
						No orders yet.
					</Text>
				)}
				{orders.map((order: any) => (
					<Link
						key={order.id}
						to={`/orders/${order.id}`}
						className="border-ui-border-base hover:bg-ui-bg-base-hover flex items-center justify-between border-b px-4 py-2 no-underline transition-colors last:border-b-0"
					>
						<div className="flex flex-col">
							<Text size="small" weight="plus">
								#{order.display_id}
							</Text>
							<Text size="xsmall" className="text-ui-fg-subtle">
								{order.customer?.first_name ? `${order.customer.first_name} ${order.customer.last_name ?? ''}` : order.email}
							</Text>
						</div>
						<div className="flex items-center gap-2">
							<Text size="small" className="font-mono">
								${(order.total ?? 0).toFixed(2)}
							</Text>
							<Badge size="xsmall" color={STATUS_COLORS[order.status] ?? 'grey'}>
								{order.status}
							</Badge>
						</div>
					</Link>
				))}
			</div>
		</Container>
	)
}
