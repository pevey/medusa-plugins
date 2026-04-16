import { Badge, Button, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { Link, LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../lib/sdk'
import { ActionMenu } from '../../../components/action-menu'
import { ComplaintActivity } from '../../../components/complaint-activity'
import { EditComplaintDrawer } from '../../../components/edit-complaint-drawer'
import { useComplaint, useDeleteComplaints } from '../../../hooks/complaints'

type ComplaintLoaderData = { complaint: { id: string; number: number } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<ComplaintLoaderData>(`/admin/complaints/${id}`, { query: { fields: 'id,number' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<ComplaintLoaderData>) =>
		data?.complaint?.number || data?.complaint?.id || 'Complaint'
}

const ComplaintDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useComplaint(id)
	const { mutate: deleteComplaints } = useDeleteComplaints()
	const complaint = data?.complaint

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete complaint?', description: 'This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteComplaints([complaint!.id], {
				onSuccess: () => { toast.success('Complaint deleted successfully'); navigate('/complaints') },
				onError: () => toast.error('Failed to delete complaint')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!complaint) return <Container className="p-6"><Text>Complaint not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Complaint Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Number</Text>
					<Text size="small" leading="compact">{complaint.number ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Status</Text>
					<Text size="small" leading="compact">{complaint.status ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Customer</Text>
					<Text size="small" leading="compact">
						<Link to={`/customers/${complaint.customer_id}`}>{complaint.customer.email ?? '-'}</Link>
					</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Order</Text>
					<Text size="small" leading="compact">
						<Link to={`/orders/${complaint.order_id}`}>{complaint.order.id ?? '-'}</Link>
					</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Product</Text>
					<Text size="small" leading="compact">
						<Link to={`/products/${complaint.product_id}`}>{complaint.product.title ?? '-'}</Link>
					</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Tags</Text>
					<div className="flex flex-wrap gap-2">
						{complaint.tags?.length ? (
							complaint.tags.map(tag => <Badge key={tag.id} size="xsmall" color="blue">{tag.value}</Badge>)
						) : (
							<Text size="small" leading="compact">-</Text>
						)}
					</div>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Description</Text>
					<Text size="small" leading="compact" className="whitespace-pre-wrap">{complaint.description ?? '-'}</Text>
				</div>
			</Container>
			<ComplaintActivity complaint={complaint} />
			<EditComplaintDrawer complaint={complaint} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default ComplaintDetailPage
