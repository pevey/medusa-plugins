import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Glasses } from '@medusajs/icons'
import { Container, Heading, Button, Text } from '@medusajs/ui'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFunnelQuery } from '../../hooks/analytics'
import FunnelChart from '../../components/funnel-chart'
import { EditFunnelDrawer } from '../../components/edit-funnel-drawer'
import { CreateFunnelModal } from '../../components/create-funnel-modal'

export const config = defineRouteConfig({
	label: 'Analytics',
	icon: Glasses,
	rank: 2
})
export const handle = { breadcrumb: () => 'Analytics' }

const AnalyticsPage = () => {
	const [period, setPeriod] = useState('30d')
	const [chartLayout, setChartLayout] = useState<'vertical' | 'horizontal'>('horizontal')
	const [editOpen, setEditOpen] = useState(false)
	const [createOpen, setCreateOpen] = useState(false)

	const { start_date, end_date } = useMemo(() => {
		const end = new Date()
		const start = new Date()
		switch (period) {
			case '7d':
				start.setDate(end.getDate() - 7)
				break
			case '30d':
				start.setDate(end.getDate() - 30)
				break
			case '90d':
				start.setDate(end.getDate() - 90)
				break
		}
		return { start_date: start.toISOString(), end_date: end.toISOString() }
	}, [period])

	const { data, isLoading } = useFunnelQuery({ start_date, end_date })

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Analytics</Heading>
					<div className="flex items-center gap-2">
						<Button size="small" variant="secondary" className="whitespace-nowrap" onClick={() => setCreateOpen(true)}>
							Create
						</Button>
						<Link to="/analytics/rubrics">
							<Button size="small" className="whitespace-nowrap">
								Manage Events
							</Button>
						</Link>
					</div>
				</div>
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Text size="small" leading="compact" className="text-ui-fg-subtle">
							Loading...
						</Text>
					</div>
				) : data?.results ? (
					<FunnelChart
						funnelName={data.funnel?.label || 'Funnel'}
						steps={data.results}
						layout={chartLayout}
						onLayoutChange={setChartLayout}
						period={period}
						onPeriodChange={setPeriod}
						onEdit={() => setEditOpen(true)}
					/>
				) : (
					<div className="flex flex-col items-center justify-center gap-y-2 py-12">
						<Text size="small" leading="compact" className="text-ui-fg-subtle">
							No funnel configured yet.
						</Text>
						<Link to="/analytics/funnel">
							<Button size="small" variant="secondary" className="whitespace-nowrap">
								Configure Funnel
							</Button>
						</Link>
					</div>
				)}
			</Container>
			<CreateFunnelModal open={createOpen} setOpen={setCreateOpen} />
			{data?.funnel && (
				<EditFunnelDrawer
					funnel={
						{
							id: data.funnel.id,
							name: data.funnel.name,
							label: data.funnel.label,
							steps: data.results.map(r => r.event),
							is_default: true
						} as any
					}
					open={editOpen}
					setOpen={setEditOpen}
				/>
			)}
		</div>
	)
}

export default AnalyticsPage
