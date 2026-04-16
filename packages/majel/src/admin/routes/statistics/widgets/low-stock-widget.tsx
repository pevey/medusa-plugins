import { Link } from 'react-router-dom'
import { Badge, Container, Heading, Text } from '@medusajs/ui'
import { ExclamationCircle, XCircle } from '@medusajs/icons'
import { useLowStock } from '../../../hooks/statistics'
import type { WidgetProps } from './index'

export const LowStockWidget = (_props: WidgetProps) => {
	const { data, isLoading } = useLowStock(50)
	const warnings = data?.warnings ?? []

	return (
		<Container className="h-full p-0 flex flex-col">
			<div className="px-4 pt-4 pb-2 flex items-center justify-between">
				<Heading level="h3">Inventory Warnings</Heading>
				{warnings.length > 0 && (
					<Badge size="xsmall" color="red">{warnings.length}</Badge>
				)}
			</div>
			<div className="flex-1 overflow-y-auto">
				{isLoading && <Text size="small" className="px-4 text-ui-fg-muted">Loading...</Text>}
				{!isLoading && warnings.length === 0 && (
					<Text size="small" className="px-4 text-ui-fg-muted">All inventory levels OK.</Text>
				)}
				{warnings.map((w: any, i: number) => (
					<Link
						key={`${w.inventory_item_id}-${w.location_id}`}
						to={`/inventory/${w.inventory_item_id}`}
						className="flex items-start gap-2 px-4 py-2 border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-base-hover transition-colors no-underline"
					>
						{w.reason === 'no_lots' ? (
							<XCircle className="text-ui-fg-error mt-0.5 shrink-0" />
						) : (
							<ExclamationCircle className="text-ui-tag-orange-icon mt-0.5 shrink-0" />
						)}
						<div className="flex-1 min-w-0">
							<Text size="small" weight="plus" className="truncate">
								{w.title || w.sku}
							</Text>
							<Text size="xsmall" className="text-ui-fg-subtle">
								{w.location_name}
								{w.reason === 'no_lots'
									? ' — No stock lots'
									: ` — ${w.available_quantity} available`}
							</Text>
						</div>
					</Link>
				))}
			</div>
		</Container>
	)
}
