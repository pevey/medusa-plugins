import { Badge, Container, Heading, Text } from '@medusajs/ui'
import type { WidgetProps } from './index'

export const FulfillmentWidget = ({ totals }: WidgetProps) => {
	const count = totals.pending_fulfillment_count ?? 0
	const color = count === 0 ? 'green' : count <= 5 ? 'orange' : 'red'

	return (
		<Container className="h-full p-4 flex flex-col">
			<Heading level="h3">Pending Fulfillment</Heading>
			<div className="flex-1 flex flex-col items-center justify-center">
				<Text size="xlarge" weight="plus" className="text-ui-fg-base text-4xl">{count}</Text>
				<Badge size="small" color={color} className="mt-2">
					{count === 0 ? 'All fulfilled' : `${count} awaiting`}
				</Badge>
			</div>
		</Container>
	)
}
