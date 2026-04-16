import { useState } from 'react'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminProductVariant } from '@medusajs/framework/types'
import { Button, Container, Heading, toast } from '@medusajs/ui'
import { ImageSparkle } from '@medusajs/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminContentItem } from '../types'
import { LibraryImagePickerModal } from '../components/library-image-picker-modal'

export const config = defineWidgetConfig({
	zone: 'product_variant.details.side.before'
})

type ProductWithImages = {
	product: {
		id: string
		images: { id: string; url: string }[] | null
	}
}

const ProductVariantImageLibraryWidget = ({
	data: variant
}: DetailWidgetProps<AdminProductVariant>) => {
	const queryClient = useQueryClient()
	const [pickerOpen, setPickerOpen] = useState(false)

	// Fetch the product to get its current images (needed to merge before patching)
	const { data: productData } = useQuery<ProductWithImages>({
		queryKey: ['product-for-variant-images', variant.product_id],
		queryFn: () =>
			sdk.client.fetch(`/admin/products/${variant.product_id}`, {
				query: { fields: 'id,images.id,images.url' }
			}),
		enabled: !!variant.product_id
	})

	const mutation = useMutation({
		mutationFn: async (item: AdminContentItem) => {
			const existingImages = productData?.product?.images ?? []

			// Step 1: Add the URL to the product's images array
			const { product: updatedProduct } = await sdk.admin.product.update(variant.product_id!, {
				images: [
					...existingImages.map(img => ({ id: img.id, url: img.url })),
					{ url: item.body! }
				]
			})

			// Step 2: Find the newly created image by matching URL
			const newImage = (updatedProduct.images ?? []).find(img => img.url === item.body)
			if (!newImage) {
				throw new Error('Could not locate newly added image on product')
			}

			// Step 3: Associate the product image with this variant
			await sdk.admin.product.batchVariantImages(variant.product_id!, variant.id, {
				add: [newImage.id]
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['product-for-variant-images', variant.product_id]
			})
			queryClient.invalidateQueries({ queryKey: ['product-variants'] })
			queryClient.invalidateQueries({ queryKey: ['product-variant', variant.product_id] })
			toast.success('Image added to variant')
		},
		onError: (err: Error) => toast.error(err.message || 'Failed to add image')
	})

	return (
		<>
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Image Library</Heading>
					<Button
						size="small"
						variant="secondary"
						onClick={() => setPickerOpen(true)}
						isLoading={mutation.isPending}
					>
						<ImageSparkle className="mr-1" />
						Add from Library
					</Button>
				</div>
			</Container>

			<LibraryImagePickerModal
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				onSelect={item => mutation.mutate(item)}
			/>
		</>
	)
}

export default ProductVariantImageLibraryWidget
