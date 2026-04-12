import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminShippingOption } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'shipping_option_type.details.after'
})

export type AdminShippingOptionWithVeeqo = {
	shipping_option: AdminShippingOption & {
		veeqo_delivery_method?: {
			veeqo_delivery_method_id: string
		}
	}
}

export const ShippingOptionVeeqoWidget = ({
	data: shipping_option
}: DetailWidgetProps<AdminShippingOption>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<AdminShippingOptionWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/shipping-options/${shipping_option.id}`, {
				query: {
					fields: 'veeqo_delivery_method.veeqo_delivery_method_id'
				}
			}),
		queryKey: ['shipping-option', shipping_option.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/shipping-options/${shipping_option.id}/sync`, {
				method: 'POST'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['shipping-option', shipping_option.id] })
			toast.success('Shipping option synced successfully')
		}
	})

	const veeqoDeliveryMethodId =
		data?.shipping_option?.veeqo_delivery_method?.veeqo_delivery_method_id || 'NOT SYNCED'

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Shipping Option</Heading>
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
				) : veeqoDeliveryMethodId ? (
					<Text size="small">ID: {veeqoDeliveryMethodId}</Text>
				) : (
					<Text size="small">NOT SYNCED</Text>
				)}
			</div>
		</Container>
	)
}
