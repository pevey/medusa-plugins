import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminProduct, AdminProductVariant } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'product.details.side.after'
})

export type AdminProductWithVeeqo = {
	product: AdminProduct & {
		veeqo_product?: {
			veeqo_product_id: string
		}
		variants: (AdminProductVariant & {
			veeqo_sellable?: {
				veeqo_sellable_id: string
			}
		})[]
	}
}

const ProductVeeqoWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<AdminProductWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/products/${product.id}`, {
				query: {
					fields:
						'veeqo_product.veeqo_product_id,variants.id,variants.veeqo_sellable.veeqo_sellable_id'
				}
			}),
		queryKey: ['product', product.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/products/${product.id}/sync`, { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['product', product.id] })
			toast.success('Product synced successfully')
		}
	})

	const veeqoProductId = data?.product?.veeqo_product?.veeqo_product_id || 'NOT SYNCED'
	const defaultVariantId =
		data?.product?.variants && data.product.variants.length === 1
			? data.product.variants[0].veeqo_sellable?.veeqo_sellable_id
			: null

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Product</Heading>
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
				{defaultVariantId && (
					<Link to={`https://app.veeqo.com/inventory/variants/${defaultVariantId}`}>
						<Text size="small">{isLoading ? 'Loading...' : 'ID: ' + veeqoProductId}</Text>
					</Link>
				)}
				{!defaultVariantId && (
					<Text size="small">{isLoading ? 'Loading...' : 'ID: ' + veeqoProductId}</Text>
				)}
			</div>
		</Container>
	)
}

export default ProductVeeqoWidget
