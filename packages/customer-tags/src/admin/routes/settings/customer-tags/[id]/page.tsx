import { Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { EditCustomerTagDrawer } from '../../../../components/edit-customer-tag-drawer'
import { useCustomerTag, useDeleteCustomerTags } from '../../../../hooks/customer-tags'

type CustomerTagLoaderData = { customer_tag: { id: string; value: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<CustomerTagLoaderData>(`/admin/customer-tags/${id}`, { query: { fields: 'id,value' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<CustomerTagLoaderData>) =>
		data?.customer_tag?.value || data?.customer_tag?.id || 'Customer Tag'
}

const CustomerTagDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useCustomerTag(id)
	const { mutate: deleteCustomerTags } = useDeleteCustomerTags()
	const customerTag = data?.customer_tag

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete customer tag?', description: 'This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteCustomerTags([customerTag!.id], {
				onSuccess: () => { toast.success('Customer tag deleted successfully'); navigate('/settings/customer-tags') },
				onError: () => toast.error('Failed to delete customer tag')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!customerTag) return <Container className="p-6"><Text>Customer tag not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Customer Tag Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Value</Text>
					<Text size="small" leading="compact">{customerTag.value ?? '-'}</Text>
				</div>
			</Container>
			<EditCustomerTagDrawer customerTag={customerTag} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default CustomerTagDetailPage
