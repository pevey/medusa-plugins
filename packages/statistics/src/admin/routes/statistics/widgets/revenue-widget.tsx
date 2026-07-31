import { Container, Heading, Text } from '@medusajs/ui'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WidgetProps } from './index'

export const RevenueWidget = ({ statistics, totals }: WidgetProps) => {
	const chartData = statistics.map((s: any) => ({
		date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
		revenue: s.revenue_total
	}))

	return (
		<Container className="flex h-full flex-col p-4">
			<div className="mb-2 flex items-center justify-between">
				<Heading level="h3">Revenue</Heading>
				<Text size="xlarge" weight="plus" className="text-ui-fg-base">
					$
					{totals.revenue_total?.toLocaleString('en-US', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					}) ?? '0.00'}
				</Text>
			</div>
			<div className="min-h-0 flex-1">
				{chartData.length > 0 ? (
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
								</linearGradient>
							</defs>
							<XAxis dataKey="date" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} width={60} />
							<Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
							<Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" />
						</AreaChart>
					</ResponsiveContainer>
				) : (
					<Text size="small" className="text-ui-fg-muted">
						No data for this period.
					</Text>
				)}
			</div>
		</Container>
	)
}
