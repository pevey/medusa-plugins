import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminCustomer } from '@medusajs/framework/types'
import { Container, Heading, Text, Button, Badge, Select, toast } from '@medusajs/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { sdk } from '../lib/sdk'
import { AdminCustomerTagsResponse, CustomerWithTags } from '../types'

export const config = defineWidgetConfig({
	zone: 'customer.details.before'
})

const CustomerTagsWidget = ({ data: customer }: DetailWidgetProps<AdminCustomer>) => {
	const queryClient = useQueryClient()
	const [selectedTagId, setSelectedTagId] = useState<string>('')
	const [showAddForm, setShowAddForm] = useState(false)

	// Fetch all available customer tags
	const { data: allTagsData, isLoading: tagsLoading } = useQuery<AdminCustomerTagsResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/customer-tags`, {
				query: { limit: 100 }
			}),
		queryKey: ['customer-tags'],
		enabled: showAddForm // only fetch when the form is visible
	})

	// Fetch the customer's currently associated tags
	const { data: customerData, isLoading: customerLoading } = useQuery<{
		customer: CustomerWithTags
	}>({
		queryFn: () =>
			sdk.client.fetch(`/admin/customers/${customer.id}`, {
				query: { fields: '+customer_tags.*' }
			}),
		queryKey: ['customer', customer.id, 'tags']
	})

	const associatedTags = customerData?.customer?.customer_tags ?? []

	// Mutation: add a tag to the customer
	const { mutate: addTag, isPending: isAdding } = useMutation({
		mutationFn: (tagId: string) =>
			sdk.client.fetch(`/admin/customers/${customer.id}/customer-tags`, {
				method: 'POST',
				body: { tag_id: tagId }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['customer', customer.id, 'tags']
			})
			setSelectedTagId('')
			setShowAddForm(false) // hide the form after adding
			toast.success('Tag added successfully')
		},
		onError: () => {
			toast.error('Failed to add tag')
		}
	})

	// Mutation: remove a tag from the customer
	const { mutate: removeTag } = useMutation({
		mutationFn: (tagId: string) =>
			sdk.client.fetch(`/admin/customers/${customer.id}/customer-tags/${tagId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['customer', customer.id, 'tags']
			})
			toast.success('Tag removed successfully')
		},
		onError: () => {
			toast.error('Failed to remove tag')
		}
	})

	// Filter out tags already associated with the customer
	const availableTags = allTagsData?.customer_tags?.filter(
		tag => !associatedTags.some(t => t.id === tag.id)
	)

	const isLoading = customerLoading

	return (
		<Container className="divide-y p-0">
			{/* Header with Add Tag button */}
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Customer Tags</Heading>
				<Button
					size="small"
					variant="secondary"
					onClick={() => {
						setShowAddForm(prev => !prev)
						setSelectedTagId('')
					}}
				>
					{showAddForm ? 'Cancel' : 'Add'}
				</Button>
			</div>

			{/* Add Tag form — only shown when showAddForm is true */}
			{showAddForm && (
				<div className="flex items-center gap-2 px-6 py-4">
					<div className="flex-1">
						<Select value={selectedTagId} onValueChange={setSelectedTagId}>
							<Select.Trigger>
								<Select.Value placeholder="Select a tag to add" />
							</Select.Trigger>
							<Select.Content>
								{tagsLoading ? (
									<Select.Item value="__loading__" disabled>
										Loading...
									</Select.Item>
								) : availableTags?.length ? (
									availableTags.map(tag => (
										<Select.Item key={tag.id} value={tag.id}>
											{tag.value}
										</Select.Item>
									))
								) : (
									<Select.Item value="__none__" disabled>
										No more tags available
									</Select.Item>
								)}
							</Select.Content>
						</Select>
					</div>
					<Button
						size="small"
						disabled={!selectedTagId || isAdding}
						isLoading={isAdding}
						onClick={() => {
							if (selectedTagId) addTag(selectedTagId)
						}}
					>
						Save
					</Button>
				</div>
			)}

			{/* Current Tags */}
			<div className="px-6 py-4">
				{isLoading ? (
					<Text size="small">Loading...</Text>
				) : associatedTags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{associatedTags.map(tag => (
							<div key={tag.id} className="flex items-center gap-1">
								<Badge size="xsmall" color="blue">
									{tag.value}
								</Badge>
								<button
									onClick={() => removeTag(tag.id)}
									className="text-ui-fg-subtle hover:text-ui-fg-base text-xs ml-1"
									aria-label={`Remove tag ${tag.value}`}
								>
									✕
								</button>
							</div>
						))}
					</div>
				) : (
					<Text size="small" className="text-ui-fg-subtle">
						No tags associated with this customer.
					</Text>
				)}
			</div>
		</Container>
	)
}

export default CustomerTagsWidget
