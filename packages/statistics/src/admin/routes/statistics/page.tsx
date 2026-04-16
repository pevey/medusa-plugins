import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ChartBar } from '@medusajs/icons'
import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { ResponsiveGridLayout, verticalCompactor, useContainerWidth, type Layout, type LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import {
	useStatistics,
	useStatisticsLayout,
	useSaveStatisticsLayout,
	useRecalculateStatistics
} from '../../hooks/statistics'
import { WIDGETS, StatisticsWidget } from './widgets'
import { McpQuery } from '../../components/mcp-query'

export const config = defineRouteConfig({
	label: 'Statistics',
	icon: ChartBar,
	rank: 0
})

export const handle = { breadcrumb: () => 'Statistics' }

type Period = 'today' | 'week' | 'month'

const PERIOD_LABELS: Record<Period, string> = {
	today: 'Today',
	week: 'This Week',
	month: 'This Month'
}

type Breakpoint = 'lg' | 'md' | 'sm'
type BreakpointLayouts = Record<Breakpoint, LayoutItem[]>

function buildDefaultLayouts(): BreakpointLayouts {
	return {
		lg: WIDGETS.map(w => ({ i: w.id, ...w.layouts.lg })),
		md: WIDGETS.map(w => ({ i: w.id, ...w.layouts.md })),
		sm: WIDGETS.map(w => ({ i: w.id, ...w.layouts.sm }))
	}
}

function mergeLayouts(saved: any[] | null, widgets: StatisticsWidget[]): BreakpointLayouts {
	const defaults = buildDefaultLayouts()
	if (!saved || saved.length === 0) return defaults

	// Saved layouts override lg positions; md/sm use defaults
	const savedMap = new Map(saved.map(s => [s.widget_id, s]))
	return {
		...defaults,
		lg: widgets.map(w => {
			const s = savedMap.get(w.id)
			if (s) return { i: w.id, ...w.layouts.lg, x: s.x, y: s.y, w: s.w, h: s.h }
			return { i: w.id, ...w.layouts.lg }
		})
	}
}

const StatisticsPage = () => {
	const [period, setPeriod] = useState<Period>('week')
	const [editMode, setEditMode] = useState(false)
	const [layouts, setLayouts] = useState<BreakpointLayouts>(buildDefaultLayouts)
	const { width: gridWidth, containerRef: gridRef, mounted: gridMounted } = useContainerWidth({
		measureBeforeMount: true
	})

	const { data: statsData, isLoading } = useStatistics(period)
	const { data: layoutData } = useStatisticsLayout()
	const { mutate: saveLayout } = useSaveStatisticsLayout()
	const { mutate: recalculate, isPending: recalculating } = useRecalculateStatistics()

	useEffect(() => {
		if (layoutData?.layout) {
			setLayouts(mergeLayouts(layoutData.layout, WIDGETS))
		}
	}, [layoutData])

	const handleLayoutChange = useCallback(
		(_layout: Layout, allLayouts: Partial<Record<Breakpoint, Layout>>) => {
			if (!editMode) return
			setLayouts(prev => ({
				...prev,
				...Object.fromEntries(
					Object.entries(allLayouts).map(([bp, l]) => [bp, [...l!]])
				)
			}))
		},
		[editMode]
	)

	const handleSaveLayout = () => {
		const payload = layouts.lg.map(l => ({
			widget_id: l.i,
			x: l.x,
			y: l.y,
			w: l.w,
			h: l.h,
			visible: true
		}))
		saveLayout(payload, {
			onSuccess: () => {
				toast.success('Layout saved')
				setEditMode(false)
			},
			onError: () => toast.error('Failed to save layout')
		})
	}

	const widgetMap = useMemo(
		() => new Map(WIDGETS.map(w => [w.id, w])),
		[]
	)

	const statistics = statsData?.statistics ?? []
	const totals = statsData?.totals ?? {
		revenue_total: 0,
		order_count: 0,
		average_order_value: 0,
		new_customer_count: 0,
		returning_customer_count: 0,
		pending_fulfillment_count: 0,
		low_stock_count: 0
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="p-0">
				<div className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
					<Heading level="h1">Statistics</Heading>
					<div className="flex items-center gap-2">
						<div className="flex rounded-lg border border-ui-border-base overflow-hidden">
							{(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
								<button
									key={p}
									onClick={() => setPeriod(p)}
									className={`px-3 py-1.5 text-xs font-medium transition-colors ${
										period === p
											? 'bg-ui-bg-base-pressed text-ui-fg-base'
											: 'text-ui-fg-subtle hover:bg-ui-bg-base-hover'
									}`}
								>
									{PERIOD_LABELS[p]}
								</button>
							))}
						</div>
						<Button
							size="small"
							variant="secondary"
							onClick={() => recalculate(undefined, {
								onSuccess: () => toast.success('Statistics recalculated'),
								onError: () => toast.error('Recalculation failed')
							})}
							isLoading={recalculating}
						>
							Recalculate
						</Button>
						{editMode ? (
							<>
								<Button size="small" variant="secondary" onClick={() => setEditMode(false)}>
									Cancel
								</Button>
								<Button size="small" onClick={handleSaveLayout}>
									Save Layout
								</Button>
							</>
						) : (
							<Button size="small" variant="secondary" onClick={() => setEditMode(true)}>
								Customize
							</Button>
						)}
						<McpQuery />
					</div>
				</div>
			</Container>

			<div ref={gridRef as React.RefObject<HTMLDivElement>} className={editMode ? 'ring-2 ring-ui-border-interactive ring-offset-2 rounded-lg' : ''}>
				{isLoading ? (
					<Container className="p-6">
						<Text className="text-ui-fg-muted">Loading statistics...</Text>
					</Container>
				) : gridMounted && (
					<ResponsiveGridLayout
						width={gridWidth}
						layouts={layouts}
						breakpoints={{ lg: 1200, md: 768, sm: 480 }}
						cols={{ lg: 12, md: 8, sm: 4 }}
						rowHeight={80}
						dragConfig={{ enabled: editMode, handle: '.drag-handle' }}
						resizeConfig={{ enabled: editMode }}
						onLayoutChange={handleLayoutChange}
						containerPadding={[0, 0]}
						compactor={verticalCompactor}
					>
						{layouts.lg.map(l => {
							const widget = widgetMap.get(l.i)
							if (!widget) return null
							const Component = widget.component
							return (
								<div key={l.i} className="relative h-full">
									{editMode && (
										<div className="drag-handle absolute top-0 left-0 right-0 h-6 bg-ui-bg-subtle-hover cursor-move rounded-t-lg flex items-center justify-center">
											<Text size="xsmall" className="text-ui-fg-muted">Drag to move</Text>
										</div>
									)}
									<Component statistics={statistics} totals={totals} period={period} />
								</div>
							)
						})}
					</ResponsiveGridLayout>
				)}
			</div>

		</div>
	)
}

export default StatisticsPage
