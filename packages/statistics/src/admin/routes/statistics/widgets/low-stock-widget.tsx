import { Link } from 'react-router-dom'
import { Badge, Container, Heading, Text } from '@medusajs/ui'
import { ExclamationCircle, XCircle } from '@medusajs/icons'
import { useLowStock } from '../../../hooks/statistics'
import type { WidgetProps } from './index'

export const LowStockWidget = (_props: WidgetProps) => {
	const { data, isLoading } = useLowStock(50)
	const warnings = data?.warnings ?? []
	// `lot_data_available` is `false` when medusa-plugin-tracing (the plugin that
	// owns lot-level stock data) isn't installed/registered, or its query failed.
	// In that mode the route still returns real inventory-level warnings (see
	// AdminStatisticsLowStockResponse in ../../../types.ts), just without the
	// lot-level "no enabled lots" distinction -- surface that instead of silently
	// pretending the data is as complete as when tracing is installed.
	const lotDataAvailable = data?.lot_data_available ?? true

	return (
		<Container className="flex h-full flex-col p-0">
			<div className="flex items-center justify-between px-4 pt-4 pb-2">
				<Heading level="h3">Inventory Warnings</Heading>
				{warnings.length > 0 && (
					<Badge size="xsmall" color="red">
						{warnings.length}
					</Badge>
				)}
			</div>
			{!isLoading && !lotDataAvailable && (
				<Text size="xsmall" className="text-ui-fg-muted border-ui-border-base border-b px-4 pb-2">
					Lot-level tracking isn't installed -- showing inventory-level warnings only.
				</Text>
			)}
			<div className="flex-1 overflow-y-auto">
				{isLoading && (
					<Text size="small" className="text-ui-fg-muted px-4">
						Loading...
					</Text>
				)}
				{!isLoading && warnings.length === 0 && (
					<Text size="small" className="text-ui-fg-muted px-4">
						All inventory levels OK.
					</Text>
				)}
				{warnings.map((w: any, i: number) => (
					<Link
						key={`${w.inventory_item_id}-${w.location_id}`}
						to={`/inventory/${w.inventory_item_id}`}
						className="border-ui-border-base hover:bg-ui-bg-base-hover flex items-start gap-2 border-b px-4 py-2 no-underline transition-colors last:border-b-0"
					>
						{w.reason === 'no_lots' ? (
							<XCircle className="text-ui-fg-error mt-0.5 shrink-0" />
						) : (
							<ExclamationCircle className="text-ui-tag-orange-icon mt-0.5 shrink-0" />
						)}
						<div className="min-w-0 flex-1">
							<Text size="small" weight="plus" className="truncate">
								{w.title || w.sku}
							</Text>
							<Text size="xsmall" className="text-ui-fg-subtle">
								{w.location_name}
								{w.reason === 'no_lots' ? ' — No stock lots' : ` — ${w.available_quantity} available`}
							</Text>
						</div>
					</Link>
				))}
			</div>
		</Container>
	)
}
