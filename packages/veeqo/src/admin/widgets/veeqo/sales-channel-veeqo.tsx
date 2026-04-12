import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminSalesChannel } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'sales_channel.details.after'
})

export type AdminSalesChannelWithVeeqo = {
	sales_channel: AdminSalesChannel & {
		veeqo_channel?: {
			veeqo_channel_id: string
		}
	}
}

const SalesChannelVeeqoWidget = ({ data: sales_channel }: DetailWidgetProps<AdminSalesChannel>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<AdminSalesChannelWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/sales-channels/${sales_channel.id}`, {
				query: {
					fields: 'veeqo_channel.veeqo_channel_id'
				}
			}),
		queryKey: ['sales-channel', sales_channel.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/sales-channels/${sales_channel.id}/sync`, {
				method: 'POST'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sales-channel', sales_channel.id] })
			toast.success('Sales channel synced successfully')
		}
	})

	const veeqoSalesChannelId = data?.sales_channel?.veeqo_channel?.veeqo_channel_id || 'NOT SYNCED'

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Sales Channel</Heading>
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
				) : veeqoSalesChannelId ? (
					<Text size="small">ID: {veeqoSalesChannelId}</Text>
				) : (
					<Text size="small">NOT SYNCED</Text>
				)}
			</div>
		</Container>
	)
}

export default SalesChannelVeeqoWidget
