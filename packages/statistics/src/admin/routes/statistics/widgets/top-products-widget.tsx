import { Container, Heading, Text } from '@medusajs/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { WidgetProps } from './index'

export const TopProductsWidget = ({ statistics }: WidgetProps) => {
	// Aggregate top_products across all days in the period
	const aggregated: Record<string, { title: string; quantity_sold: number }> = {}
	for (const stat of statistics as any[]) {
		for (const p of stat?.top_products ?? []) {
			if (!p?.product_id) continue
			const existing = aggregated[p.product_id]
			if (existing) {
				existing.quantity_sold += p.quantity_sold
			} else {
				aggregated[p.product_id] = { title: p.title, quantity_sold: p.quantity_sold }
			}
		}
	}
	const products = Object.values(aggregated)
		.sort((a, b) => b.quantity_sold - a.quantity_sold)
		.slice(0, 8)

	const chartData = products.map(p => ({
		name: p.title.length > 20 ? p.title.slice(0, 20) + '...' : p.title,
		sold: p.quantity_sold
	}))

	return (
		<Container className="h-full p-4 flex flex-col">
			<Heading level="h3" className="mb-2">Top Products</Heading>
			<div className="flex-1 min-h-0">
				{chartData.length > 0 ? (
					<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
						<BarChart data={chartData} layout="vertical">
							<XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
							<YAxis
								type="category"
								dataKey="name"
								tick={{ fontSize: 11 }}
								width={120}
							/>
							<Tooltip />
							<Bar dataKey="sold" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
						</BarChart>
					</ResponsiveContainer>
				) : (
					<Text size="small" className="text-ui-fg-muted">No data yet.</Text>
				)}
			</div>
		</Container>
	)
}
