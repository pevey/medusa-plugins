import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { Badge, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { EditWebhookTriggerDrawer } from '../../../../components/edit-webhook-trigger-drawer'
import { WebhookActionsTable } from '../../../../components/webhook-actions-table'
import { TriggerType } from '../../../../types'
import { useWebhookTrigger, useWebhookReceipts, useDeleteWebhookTriggers } from '../../../../hooks/webhooks'

type LoaderData = { trigger: { id: string; name: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<LoaderData>(`/admin/webhook-triggers/${id}`, { query: { fields: 'id,name' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<LoaderData>) => data?.trigger?.name || data?.trigger?.id || 'Webhook'
}

const TRIGGER_LABELS: Record<TriggerType, string> = { medusa_event: 'Medusa Event', incoming_webhook: 'Incoming Webhook' }
const TRIGGER_COLORS: Record<TriggerType, 'blue' | 'purple'> = { medusa_event: 'blue', incoming_webhook: 'purple' }

const WebhookTriggerDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useWebhookTrigger(id)
	const trigger = data?.trigger

	const { data: receiptsData } = useWebhookReceipts(id, !!trigger?.log_incoming)

	const { mutate: deleteTriggers } = useDeleteWebhookTriggers()

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete trigger?', description: 'This will also delete all associated actions and deliveries. This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteTriggers([id!], {
				onSuccess: () => { toast.success('Webhook deleted'); navigate('/settings/webhooks') },
				onError: () => toast.error('Failed to delete webhook')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!trigger) return <Container className="p-6"><Text>Trigger not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Trigger Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Name</Text>
					<Text size="small" leading="compact">{trigger.name}</Text>
				</div>
				{trigger.description && (
					<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
						<Text size="small" weight="plus" leading="compact">Description</Text>
						<Text size="small" leading="compact">{trigger.description}</Text>
					</div>
				)}
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Trigger Type</Text>
					<Badge size="xsmall" color={TRIGGER_COLORS[trigger.trigger_type]}>{TRIGGER_LABELS[trigger.trigger_type]}</Badge>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Status</Text>
					<Badge size="xsmall" color={trigger.is_active ? 'green' : 'grey'}>{trigger.is_active ? 'Active' : 'Inactive'}</Badge>
				</div>
				{trigger.trigger_type === 'medusa_event' && (
					<div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
						<Text size="small" weight="plus" leading="compact">Trigger Events</Text>
						<div className="flex flex-wrap gap-1">
							{(trigger.trigger_events ?? []).length > 0 ? (
								trigger.trigger_events!.map(evt => <Badge key={evt} size="xsmall" color="orange">{evt}</Badge>)
							) : (
								<Text size="small" leading="compact">—</Text>
							)}
						</div>
					</div>
				)}
				{trigger.trigger_type === 'incoming_webhook' && (
					<>
						<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
							<Text size="small" weight="plus" leading="compact">Receive URL</Text>
							<Text size="small" leading="compact" className="break-all font-mono text-xs">{window.location.origin}/webhooks/{trigger.id}</Text>
						</div>
						<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
							<Text size="small" weight="plus" leading="compact">Signing Key</Text>
							<Text size="small" leading="compact">{trigger.trigger_signing_key ? '••••••••' : 'Not set'}</Text>
						</div>
						<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
							<Text size="small" weight="plus" leading="compact">Log Incoming Payloads</Text>
							<Badge size="xsmall" color={trigger.log_incoming ? 'green' : 'grey'}>{trigger.log_incoming ? 'Enabled' : 'Disabled'}</Badge>
						</div>
					</>
				)}
			</Container>

			<WebhookActionsTable triggerId={trigger.id} triggerType={trigger.trigger_type} triggerEvents={trigger.trigger_events ?? []} />

			{trigger.trigger_type === 'incoming_webhook' && (
				<Container className="divide-y p-0">
					<div className="px-6 py-4">
						<Heading level="h2">Recent Receipts</Heading>
						<Text size="small" className="text-ui-fg-subtle mt-1">Last 10 logged incoming payloads for this trigger.</Text>
					</div>
					{!trigger.log_incoming ? (
						<div className="px-6 py-4"><Text size="small" className="text-ui-fg-subtle">Payload logging is disabled.</Text></div>
					) : !receiptsData || receiptsData.receipts.length === 0 ? (
						<div className="px-6 py-4"><Text size="small" className="text-ui-fg-subtle">No receipts yet.</Text></div>
					) : (
						<div className="divide-y">
							{receiptsData.receipts.map(receipt => (
								<div key={receipt.id} className="grid grid-cols-3 items-start gap-2 px-6 py-3">
									<Text size="small" leading="compact" className="text-ui-fg-subtle col-span-1">{new Date(receipt.created_at).toLocaleString()}</Text>
									<Text size="small" leading="compact" className="text-ui-fg-subtle col-span-1">{receipt.request_ip ?? '—'}</Text>
									<pre className="col-span-1 font-mono text-xs bg-ui-bg-subtle rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(receipt.payload, null, 2)}</pre>
								</div>
							))}
						</div>
					)}
				</Container>
			)}

			<EditWebhookTriggerDrawer trigger={trigger} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default WebhookTriggerDetailPage
