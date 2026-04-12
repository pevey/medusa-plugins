import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminProductVariant } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'product_variant.details.side.after'
})

type VariantWithVeeqo = {
	variant: AdminProductVariant & {
		veeqo_sellable?: {
			veeqo_sellable_id: string
		}
	}
}

const ProductVariantVeeqoWidget = ({ data: variant }: DetailWidgetProps<AdminProductVariant>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<VariantWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/products/${variant.product_id}/variants/${variant.id}`, {
				query: {
					fields: 'veeqo_sellable.*'
				}
			}),
		queryKey: ['product-variant', variant.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/products/${variant.product_id}/sync`, { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['product-variant', variant.id] })
			toast.success('Product synced successfully')
		}
	})

	const veeqoSellableId = data?.variant?.veeqo_sellable?.veeqo_sellable_id || 'NOT SYNCED'

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Sellable</Heading>
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
				<Link to={`https://app.veeqo.com/inventory/variants/${veeqoSellableId}`}>
					<Text size="small">{isLoading ? 'Loading...' : 'ID: ' + veeqoSellableId}</Text>
				</Link>
			</div>
		</Container>
	)
}

export default ProductVariantVeeqoWidget
