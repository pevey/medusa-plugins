import { Button, Container, Heading, Text, toast } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminCustomer } from '@medusajs/framework/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../../lib/sdk'

export const config = defineWidgetConfig({
	zone: 'customer.details.side.after'
})

export type AdminCustomerWithVeeqo = {
	customer: AdminCustomer & {
		veeqo_customer?: {
			veeqo_customer_id: string
		}
	}
}

const CustomerVeeqoWidget = ({ data: customer }: DetailWidgetProps<AdminCustomer>) => {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery<AdminCustomerWithVeeqo>({
		queryFn: () =>
			sdk.client.fetch(`/admin/customers/${customer.id}`, {
				query: {
					fields: 'veeqo_customer.veeqo_customer_id'
				}
			}),
		queryKey: ['customer', customer.id]
	})

	const syncMutation = useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/veeqo/customers/${customer.id}/sync`, { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer', customer.id] })
			toast.success('Customer synced successfully')
		}
	})

	const veeqoCustomerId = data?.customer?.veeqo_customer?.veeqo_customer_id || 'NOT SYNCED'

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Veeqo Customer</Heading>
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
				<Text size="small">{isLoading ? 'Loading...' : 'ID: ' + veeqoCustomerId}</Text>
			</div>
		</Container>
	)
}

export default CustomerVeeqoWidget
