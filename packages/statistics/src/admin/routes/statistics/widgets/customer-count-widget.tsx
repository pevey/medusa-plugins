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
		<Container className="h-full p-4 flex flex-col">
			<Heading level="h3">Customers</Heading>
			<Text size="xlarge" weight="plus" className="text-ui-fg-base mt-1">{total}</Text>
			<div className="flex-1 min-h-0 mt-1">
				{total > 0 ? (
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
						<PieChart>
							<Pie
								data={chartData}
								dataKey="value"
								innerRadius="50%"
								outerRadius="80%"
								paddingAngle={2}
							>
								{chartData.map((_, i) => (
									<Cell key={i} fill={COLORS[i]} />
								))}
							</Pie>
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				) : (
					<Text size="small" className="text-ui-fg-muted">No data yet.</Text>
				)}
			</div>
			<div className="flex gap-4 text-xs text-ui-fg-subtle">
				<span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[0] }} />New: {newCount}</span>
				<span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[1] }} />Returning: {returningCount}</span>
			</div>
		</Container>
	)
}
