import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { Badge, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { sdk } from '../../../../../../lib/sdk'
import { ActionMenu } from '../../../../../../components/action-menu'
import { EditWebhookActionDrawer } from '../../../../../../components/edit-webhook-action-drawer'
import { MEDUSA_WORKFLOWS_BY_NAME } from '../../../../../../lib/medusa-workflows'
import { ActionType, WebhookDelivery } from '../../../../../../types'
import { useWebhookAction, useWebhookDeliveries, useDeleteWebhookActions } from '../../../../../../hooks/webhooks'

type LoaderData = { action: { id: string; name: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id, actionId } = params
	return sdk.client.fetch<LoaderData>(`/admin/webhook-triggers/${id}/actions/${actionId}`, { query: { fields: 'id,name' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<LoaderData>) => data?.action?.name || data?.action?.id || 'Action'
}

const ACTION_LABELS: Record<ActionType, string> = { outgoing_webhook: 'Send Outgoing Webhook', outgoing_request: 'Send Outgoing Request', medusa_workflow: 'Run Medusa Workflow' }
const ACTION_COLORS: Record<ActionType, 'orange' | 'green'> = { outgoing_webhook: 'orange', outgoing_request: 'orange', medusa_workflow: 'green' }

const DeliveryStatusBadge = ({ status }: { status: WebhookDelivery['status'] }) => {
	const color = status === 'success' ? 'green' : status === 'failed' ? 'red' : 'orange'
	return <Badge size="xsmall" color={color}>{status}</Badge>
}

const WebhookActionDetailPage = () => {
	const { id: triggerId, actionId } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useWebhookAction(triggerId, actionId)
	const action = data?.action

	const { data: deliveriesData } = useWebhookDeliveries(triggerId, actionId)

	const { mutate: deleteActions } = useDeleteWebhookActions(triggerId!)

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete action?', description: 'This will also delete all associated deliveries. This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteActions([actionId!], {
				onSuccess: () => { toast.success('Action deleted'); navigate(`/settings/webhooks/${triggerId}`) },
				onError: () => toast.error('Failed to delete action')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!action) return <Container className="p-6"><Text>Action not found.</Text></Container>

	const isOutgoing = action.action_type === 'outgoing_webhook'

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Action Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Name</Text>
					<Text size="small" leading="compact">{action.name}</Text>
				</div>
				{action.description && (
					<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
						<Text size="small" weight="plus" leading="compact">Description</Text>
						<Text size="small" leading="compact">{action.description}</Text>
					</div>
				)}
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Action Type</Text>
					<Badge size="xsmall" color={ACTION_COLORS[action.action_type]}>{ACTION_LABELS[action.action_type]}</Badge>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Status</Text>
					<Badge size="xsmall" color={action.is_active ? 'green' : 'grey'}>{action.is_active ? 'Active' : 'Inactive'}</Badge>
				</div>
				{isOutgoing && (
					<>
						<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
							<Text size="small" weight="plus" leading="compact">Target URL</Text>
							<Text size="small" leading="compact" className="break-all">{action.target_url ?? '—'}</Text>
						</div>
						{(action.target_headers ?? []).length > 0 && (
							<div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
								<Text size="small" weight="plus" leading="compact">Headers</Text>
								<div className="flex flex-col gap-1">
									{action.target_headers!.map((h, i) => (
										<Text key={i} size="small" leading="compact"><span className="font-medium">{h.key}:</span> {h.value}</Text>
									))}
								</div>
							</div>
						)}
					</>
				)}
				{!isOutgoing && (
					<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
						<Text size="small" weight="plus" leading="compact">Medusa Workflow</Text>
						<Text size="small" leading="compact">{action.medusa_workflow ? (MEDUSA_WORKFLOWS_BY_NAME[action.medusa_workflow]?.label ?? action.medusa_workflow) : '—'}</Text>
					</div>
				)}
			</Container>

			{(action.field_mappings ?? []).length > 0 && (
				<Container className="divide-y p-0">
					<div className="px-6 py-4"><Heading level="h2">Field Mappings</Heading></div>
					<div className="px-6 py-4">
						<div className="grid grid-cols-2 gap-2 mb-2">
							<Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">Source</Text>
							<Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">{isOutgoing ? 'Outgoing Key' : 'Workflow Input'}</Text>
						</div>
						{action.field_mappings!.map((m, i) => (
							<div key={i} className="grid grid-cols-2 gap-2 mt-2">
								<Text size="small" leading="compact" className="font-mono text-xs">{m.source_path}</Text>
								<Text size="small" leading="compact" className="font-mono text-xs">{m.target_key}</Text>
							</div>
						))}
					</div>
				</Container>
			)}

			<Container className="divide-y p-0">
				<div className="px-6 py-4">
					<Heading level="h2">Recent Deliveries</Heading>
					<Text size="small" className="text-ui-fg-subtle mt-1">Last 10 delivery attempts for this action.</Text>
				</div>
				{!deliveriesData || deliveriesData.deliveries.length === 0 ? (
					<div className="px-6 py-4"><Text size="small" className="text-ui-fg-subtle">No deliveries yet.</Text></div>
				) : (
					<div className="divide-y">
						{deliveriesData.deliveries.map(delivery => (
							<div key={delivery.id} className="grid grid-cols-4 items-center gap-2 px-6 py-3">
								<Text size="small" leading="compact" className="font-mono text-xs truncate">{delivery.event_name}</Text>
								<DeliveryStatusBadge status={delivery.status} />
								<Text size="small" leading="compact" className="text-ui-fg-subtle">{delivery.response_status ? `HTTP ${delivery.response_status}` : delivery.error_message ?? '—'}</Text>
								<Text size="small" leading="compact" className="text-ui-fg-subtle text-right">{new Date(delivery.created_at).toLocaleString()}</Text>
							</div>
						))}
					</div>
				)}
			</Container>

			{action && (
				<EditWebhookActionDrawer action={action} triggerId={triggerId!} open={editOpen} setOpen={setEditOpen} />
			)}
		</div>
	)
}

export default WebhookActionDetailPage
