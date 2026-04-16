import { Container, Heading, Text } from '@medusajs/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WidgetProps } from './index'

export const OrdersCountWidget = ({ statistics, totals }: WidgetProps) => {
	const chartData = statistics.map((s: any) => ({
		date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
		orders: s.order_count
	}))

	return (
		<Container className="h-full p-4 flex flex-col">
			<div className="flex items-center justify-between mb-2">
				<Heading level="h3">Orders</Heading>
				<Text size="xlarge" weight="plus" className="text-ui-fg-base">
					{totals.order_count?.toLocaleString() ?? 0}
				</Text>
			</div>
			<div className="flex-1 min-h-0">
				{chartData.length > 0 ? (
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
						<BarChart data={chartData}>
							<XAxis dataKey="date" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
							<Tooltip />
							<Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				) : (
					<Text size="small" className="text-ui-fg-muted">No data for this period.</Text>
				)}
			</div>
		</Container>
	)
}
