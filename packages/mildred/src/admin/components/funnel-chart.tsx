import { Heading, Select, Text } from '@medusajs/ui'
import { PencilSquare } from '@medusajs/icons'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts'
import { ActionMenu } from './action-menu'
import type { FunnelStep } from '../types/analytics'

type FunnelChartProps = {
	funnelName: string
	steps: FunnelStep[]
	layout: 'vertical' | 'horizontal'
	onLayoutChange: (layout: 'vertical' | 'horizontal') => void
	period: string
	onPeriodChange: (period: string) => void
	onEdit: () => void
}

const BAR_COLOR = '#8d2bfb'

const FunnelChart = ({ funnelName, steps, layout, onLayoutChange, period, onPeriodChange, onEdit }: FunnelChartProps) => {
	const chartData = steps.map((step, i) => ({
		name: step.event.replace(/_/g, ' '),
		count: step.count,
		rate: i === 0 ? '100%' : `${(step.conversion_rate * 100).toFixed(1)}%`
	}))

	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between px-6 py-4">
				<div className="flex flex-wrap md:flex-nowrap whitespace-nowrap gap-2">
					<Heading level="h2" className="mr-2">{funnelName}</Heading>
					<ActionMenu
						groups={[
							{
								actions: [
									{ label: 'Edit', icon: <PencilSquare />, onClick: onEdit }
								]
							}
						]}
					/>
				</div>
				<div className="flex flex-wrap md:flex-nowrap items-center gap-2">
					<Select
						size="small"
						value={layout}
						onValueChange={(v) => onLayoutChange(v as 'vertical' | 'horizontal')}
					>
						<Select.Trigger className="whitespace-nowrap">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="horizontal">Vertical</Select.Item>
							<Select.Item value="vertical">Horizontal</Select.Item>
						</Select.Content>
					</Select>
					<Select size="small" value={period} onValueChange={onPeriodChange}>
						<Select.Trigger className="whitespace-nowrap">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="7d">Last 7 days</Select.Item>
							<Select.Item value="30d">Last 30 days</Select.Item>
							<Select.Item value="90d">Last 90 days</Select.Item>
						</Select.Content>
					</Select>
				</div>
			</div>
			{steps.length === 0 ? (
				<div className="flex items-center justify-center py-12">
					<Text size="small" leading="compact" className="text-ui-fg-subtle">
						No funnel data available for this period
					</Text>
				</div>
			) : (
				<div className="flex flex-col gap-y-4">
					<ResponsiveContainer width="100%" height={layout === 'vertical' ? 300 : 320} minWidth={0} minHeight={0}>
						{layout === 'vertical' ? (
							<BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }} barCategoryGap="8%">
								<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-base, #e5e7eb)" />
								<XAxis type="number" tick={{ fontSize: 11 }} />
								<YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
								<Tooltip
									formatter={(value: number) => [value.toLocaleString(), 'Count']}
									labelStyle={{ fontWeight: 600 }}
								/>
								<Bar dataKey="count" radius={[0, 6, 6, 0]} fill={BAR_COLOR}>
									{chartData.map((_entry, i) => (
										<Cell key={i} fill={BAR_COLOR} fillOpacity={1 - i * 0.12} />
									))}
								</Bar>
							</BarChart>
						) : (
							<BarChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 20 }} barCategoryGap="8%">
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-base, #e5e7eb)" />
								<XAxis
									dataKey="name"
									tick={{ fontSize: 11 }}
									interval={0}
									angle={0}
									textAnchor="middle"
								/>
								<YAxis tick={{ fontSize: 11 }} />
								<Tooltip
									formatter={(value: number) => [value.toLocaleString(), 'Count']}
									labelStyle={{ fontWeight: 600 }}
								/>
								<Bar dataKey="count" radius={[6, 6, 0, 0]}>
									{chartData.map((_entry, i) => (
										<Cell key={i} fill={BAR_COLOR} fillOpacity={1 - i * 0.12} />
									))}
								</Bar>
							</BarChart>
						)}
					</ResponsiveContainer>
					<div className="flex flex-col gap-y-2 px-6 pb-4">
						{steps.map((step, i) => (
							<div key={step.event} className="flex items-center justify-between">
								<Text size="small" leading="compact" weight="plus">
									{step.event.replace(/_/g, ' ')}
								</Text>
								<div className="flex items-center gap-x-4">
									<Text size="small" leading="compact" className="text-ui-fg-subtle">
										{step.count.toLocaleString()}
									</Text>
									{i > 0 && (
										<Text size="small" leading="compact" className="text-ui-fg-subtle">
											{(step.conversion_rate * 100).toFixed(1)}%
										</Text>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export default FunnelChart
