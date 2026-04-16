import { Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { EditComplaintTagDrawer } from '../../../../components/edit-complaint-tag-drawer'
import { useComplaintTag, useDeleteComplaintTags } from '../../../../hooks/complaint-tags'

type ComplaintTagLoaderData = { complaint_tag: { id: string; value: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<ComplaintTagLoaderData>(`/admin/complaint-tags/${id}`, { query: { fields: 'id,value' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<ComplaintTagLoaderData>) =>
		data?.complaint_tag?.value || data?.complaint_tag?.id || 'Complaint Tag'
}

const ComplaintTagDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useComplaintTag(id)
	const { mutate: deleteComplaintTags } = useDeleteComplaintTags()
	const complaintTag = data?.complaint_tag

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete complaint tag?', description: 'This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteComplaintTags([complaintTag!.id], {
				onSuccess: () => { toast.success('Complaint tag deleted successfully'); navigate('/settings/complaint-tags') },
				onError: () => toast.error('Failed to delete complaint tag')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!complaintTag) return <Container className="p-6"><Text>Complaint tag not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Complaint Tag Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Value</Text>
					<Text size="small" leading="compact">{complaintTag.value ?? '-'}</Text>
				</div>
			</Container>
			<EditComplaintTagDrawer complaintTag={complaintTag} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default ComplaintTagDetailPage
