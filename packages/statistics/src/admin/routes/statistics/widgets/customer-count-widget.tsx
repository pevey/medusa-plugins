import { Container, Heading, Text } from '@medusajs/ui'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { WidgetProps } from './index'

const COLORS = ['#6366f1', '#a5b4fc']

export const CustomerCountWidget = ({ totals }: WidgetProps) => {
	const newCount = totals.new_customer_count ?? 0
	const returningCount = totals.returning_customer_count ?? 0
	const total = newCount + returningCount

	const chartData = [
		{ name: 'New', value: newCount },
		{ name: 'Returning', value: returningCount }
	]

	return (
		<Container className="flex h-full flex-col p-4">
			<Heading level="h3">Customers</Heading>
			<Text size="xlarge" weight="plus" className="text-ui-fg-base mt-1">
				{total}
			</Text>
			<div className="mt-1 min-h-0 flex-1">
				{total > 0 ? (
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
						<PieChart>
							<Pie data={chartData} dataKey="value" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
								{chartData.map((_, i) => (
									<Cell key={i} fill={COLORS[i]} />
								))}
							</Pie>
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				) : (
					<Text size="small" className="text-ui-fg-muted">
						No data yet.
					</Text>
				)}
			</div>
			<div className="text-ui-fg-subtle flex gap-4 text-xs">
				<span>
					<span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[0] }} />
					New: {newCount}
				</span>
				<span>
					<span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[1] }} />
					Returning: {returningCount}
				</span>
			</div>
		</Container>
	)
}
