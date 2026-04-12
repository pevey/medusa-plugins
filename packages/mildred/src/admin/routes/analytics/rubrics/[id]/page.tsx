import { Badge, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { RubricEventsTable } from '../../../../components/rubric-events-table'
import { EditRubricDrawer } from '../../../../components/edit-rubric-drawer'
import { useRubric, useDeleteRubrics } from '../../../../hooks/analytics'

type RubricLoaderData = { rubric: { id: string; label: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<RubricLoaderData>(`/admin/analytics/rubrics/${id}`, { query: { fields: 'id,label' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<RubricLoaderData>) =>
		data?.rubric?.label || data?.rubric?.id || 'Rubric'
}

const RubricDetailPage = () => {
	const { id } = useParams<{ id: string }>()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useRubric(id)
	const { mutate: deleteRubrics } = useDeleteRubrics()
	const rubric = data?.rubric

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete rubric?', description: 'This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteRubrics([rubric!.id], {
				onSuccess: () => { toast.success('Rubric deleted successfully'); navigate('/analytics/rubrics') },
				onError: () => toast.error('Failed to delete rubric')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!rubric) return <Container className="p-6"><Text>Rubric not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Rubric Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Name</Text>
					<Text size="small" leading="compact">{rubric.name ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Label</Text>
					<Text size="small" leading="compact">{rubric.label ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Description</Text>
					<Text size="small" leading="compact">{rubric.description ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Status</Text>
					<Badge color={rubric.active ? 'green' : 'grey'} size="xsmall">{rubric.active ? 'Active' : 'Inactive'}</Badge>
				</div>
			</Container>
			<RubricEventsTable rubricName={rubric.name} />
			<EditRubricDrawer rubric={rubric} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default RubricDetailPage
