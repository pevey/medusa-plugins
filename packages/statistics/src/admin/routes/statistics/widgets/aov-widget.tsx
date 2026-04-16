import { Container, Heading, Text } from '@medusajs/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WidgetProps } from './index'

const PERIOD_LABELS: Record<string, string> = {
	today: 'Today',
	week: 'Last 7 days',
	month: 'Last 30 days'
}

export const AovWidget = ({ statistics, totals, period }: WidgetProps) => {
	const chartData = statistics.map((s: any) => ({
		date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
		aov: s.average_order_value
	}))

	return (
		<Container className="h-full p-4 flex flex-col">
			<div className="flex items-center justify-between mb-1">
				<Heading level="h3">Avg Order Value</Heading>
				<Text size="xsmall" className="text-ui-fg-muted">{PERIOD_LABELS[period] ?? period}</Text>
			</div>
			<Text size="xlarge" weight="plus" className="text-ui-fg-base">
				${totals.average_order_value?.toFixed(2) ?? '0.00'}
			</Text>
			<div className="flex-1 min-h-0 mt-2">
				{chartData.length > 1 ? (
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
						<LineChart data={chartData}>
							<XAxis dataKey="date" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={(v: number) => `$${v}`} />
							<Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'AOV']} />
							<Line
								type="monotone"
								dataKey="aov"
								stroke="#f59e0b"
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<Text size="small" className="text-ui-fg-muted">Not enough data to chart.</Text>
				)}
			</div>
		</Container>
	)
}
