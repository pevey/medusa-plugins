import { Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { EditInvalidationReasonDrawer } from '../../../../components/edit-invalidation-reason-drawer'
import { useInvalidationReason, useDeleteInvalidationReasons } from '../../../../hooks/invalidation-reasons'

type InvalidationReasonLoaderData = { invalidation_reason: { id: string; value: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<InvalidationReasonLoaderData>(`/admin/invalidation-reasons/${id}`, { query: { fields: 'id,value' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<InvalidationReasonLoaderData>) =>
		data?.invalidation_reason?.value || data?.invalidation_reason?.id || 'Invalidation Reason'
}

const InvalidationReasonDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useInvalidationReason(id)
	const { mutate: deleteInvalidationReasons } = useDeleteInvalidationReasons()
	const invalidationReason = data?.invalidation_reason

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete invalidation reason?', description: 'This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteInvalidationReasons([invalidationReason!.id], {
				onSuccess: () => { toast.success('Invalidation reason deleted successfully'); navigate('/settings/invalidation-reasons') },
				onError: () => toast.error('Failed to delete invalidation reason')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!invalidationReason) return <Container className="p-6"><Text>Invalidation reason not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Invalidation Reason Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Value</Text>
					<Text size="small" leading="compact">{invalidationReason.value ?? '-'}</Text>
				</div>
			</Container>
			<EditInvalidationReasonDrawer invalidationReason={invalidationReason} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default InvalidationReasonDetailPage
