import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminStockLocation } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'location.details.side.after'
})

export type AdminStockLocationWithVeeqo = {
	stock_location: AdminStockLocation & {
		veeqo_warehouse?: {
			veeqo_warehouse_id: string
		}
	}
}

const StockLocationVeeqoWidget = ({
	data: stock_location
}: DetailWidgetProps<AdminStockLocation>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<AdminStockLocationWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/stock-locations/${stock_location.id}`, {
				query: {
					fields: 'veeqo_warehouse.veeqo_warehouse_id'
				}
			}),
		queryKey: ['stock-location', stock_location.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/stock-locations/${stock_location.id}/sync`, {
				method: 'POST'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-location', stock_location.id] })
			toast.success('Stock location synced successfully')
		}
	})

	const veeqoStockLocationId =
		data?.stock_location?.veeqo_warehouse?.veeqo_warehouse_id || 'NOT SYNCED'

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Stock Location</Heading>
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
				) : veeqoStockLocationId ? (
					<Text size="small">ID: {veeqoStockLocationId}</Text>
				) : (
					<Text size="small">NOT SYNCED</Text>
				)}
			</div>
		</Container>
	)
}

export default StockLocationVeeqoWidget
