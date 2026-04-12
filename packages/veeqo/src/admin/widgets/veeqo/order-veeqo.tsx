import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminOrder } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'order.details.side.after'
})

export type AdminOrderWithVeeqo = {
	order: AdminOrder & {
		veeqo_order?: {
			veeqo_order_id: string
		}
	}
}

const OrderVeeqoWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<AdminOrderWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/orders/${order.id}`, {
				query: {
					fields: 'veeqo_order.veeqo_order_id'
				}
			}),
		queryKey: ['order', order.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/orders/${order.id}/sync`, { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['order', order.id] })
			toast.success('Order synced successfully')
		}
	})

	const veeqoOrderId = data?.order?.veeqo_order?.veeqo_order_id || 'NOT SYNCED'

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Order</Heading>
				<Button
					size="small"
					variant="secondary"
					onClick={() => syncMutation.mutate()}
					disabled={syncMutation.isPending}
				>
					{syncMutation.isPending ? 'Syncing...' : 'Sync'}
				</Button>
			</div>

			<div className="px-6 py-4">
				{isLoading ? (
					'Loading...'
				) : veeqoOrderId ? (
					<Link to={`https://app.veeqo.com/orders/${veeqoOrderId}`}>
						<Text size="small">ID: {veeqoOrderId}</Text>
					</Link>
				) : (
					<Text size="small">NOT SYNCED</Text>
				)}
			</div>
		</Container>
	)
}

export default OrderVeeqoWidget
