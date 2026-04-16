import { useState } from 'react'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminProduct } from '@medusajs/framework/types'
import { Button, Container, Heading, toast } from '@medusajs/ui'
import { ImageSparkle } from '@medusajs/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminContentItem } from '../types'
import { LibraryImagePickerModal } from '../components/library-image-picker-modal'

export const config = defineWidgetConfig({
	zone: 'product.details.side.before'
})

const ProductImageLibraryWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
	const queryClient = useQueryClient()
	const [pickerOpen, setPickerOpen] = useState(false)

	const mutation = useMutation({
		mutationFn: (item: AdminContentItem) =>
			sdk.admin.product.update(product.id, {
				images: [
					...(product.images ?? []).map(img => ({ id: img.id, url: img.url })),
					{ url: item.body! }
				]
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] })
			queryClient.invalidateQueries({ queryKey: ['product', product.id] })
			toast.success('Image added to product')
		},
		onError: () => toast.error('Failed to add image')
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

export default ProductImageLibraryWidget
