import {
	Badge,
	Button,
	Copy,
	Drawer,
	Heading,
	Input,
	Label,
	Text,
	toast
} from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { CreatedSecret } from '../types'
import { useWebhookSecrets, useCreateWebhookSecret, useDeleteWebhookSecret } from '../hooks/webhooks'

type Props = {
	open: boolean
	setOpen: (open: boolean) => void
}

export const ManageWebhookSecretsModal = ({ open, setOpen }: Props) => {
	const [newLabel, setNewLabel] = useState('')
	const [revealedSecret, setRevealedSecret] = useState<CreatedSecret | null>(null)

	const { data, isLoading } = useWebhookSecrets(open)
	const { mutateAsync: createSecret, isPending: isCreating } = useCreateWebhookSecret()
	const { mutateAsync: deleteSecret } = useDeleteWebhookSecret()

	const handleCreate = async () => {
		if (!newLabel.trim()) return
		try {
			const res = await createSecret(newLabel.trim())
			setRevealedSecret(res.secret)
			setNewLabel('')
		} catch {
			toast.error('Failed to create secret')
		}
	}

	const handleDelete = async (id: string, label: string) => {
		if (!window.confirm(`Delete secret "${label}"? Any actions using it will stop signing.`)) return
		try {
			await deleteSecret(id)
			toast.success('Secret deleted')
			if (revealedSecret?.id === id) setRevealedSecret(null)
		} catch {
			toast.error('Failed to delete secret')
		}
	}

	const handleClose = () => {
		setRevealedSecret(null)
		setNewLabel('')
		setOpen(false)
	}

	return (
		<Drawer open={open} onOpenChange={handleClose}>
			<Drawer.Content>
				<Drawer.Header>
					<Heading level="h2">Signing Secrets</Heading>
				</Drawer.Header>

				<Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto p-6">
					<Text size="small" className="text-ui-fg-subtle">
						Shared secrets used to sign outgoing webhook payloads with HMAC-SHA256. The secret
						value is shown only once at creation — store it securely.
					</Text>

					{/* One-time secret reveal */}
					{revealedSecret && (
						<div className="rounded-lg border border-ui-border-interactive bg-ui-bg-field p-4 flex flex-col gap-y-2">
							<div className="flex items-center justify-between">
								<Text size="small" weight="plus" leading="compact">
									{revealedSecret.label}
								</Text>
								<Badge size="xsmall" color="green">New — copy now</Badge>
							</div>
							<Text size="small" className="text-ui-fg-subtle">
								This secret will not be shown again.
							</Text>
							<div className="flex items-center gap-x-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
								<code className="font-mono text-xs text-ui-fg-base flex-1 break-all select-all">
									{revealedSecret.secret}
								</code>
								<Copy content={revealedSecret.secret} className="shrink-0 text-ui-fg-muted hover:text-ui-fg-base cursor-pointer" />
							</div>
							<Button
								type="button"
								size="small"
								variant="secondary"
								onClick={() => setRevealedSecret(null)}
								className="self-end"
							>
								Done
							</Button>
						</div>
					)}

					{/* Existing secrets list */}
					{isLoading ? (
						<Text size="small" className="text-ui-fg-subtle">Loading…</Text>
					) : (data?.secrets ?? []).length === 0 && !revealedSecret ? (
						<Text size="small" className="text-ui-fg-subtle">
							No secrets yet. Create one below.
						</Text>
					) : (
						<div className="flex flex-col gap-y-2">
							{(data?.secrets ?? []).map(s => (
								<div
									key={s.id}
									className="flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3"
								>
									<div className="flex flex-col gap-y-0.5">
										<Text size="small" weight="plus" leading="compact">{s.label}</Text>
										<Text size="xsmall" className="text-ui-fg-muted font-mono">
											{s.id}
										</Text>
									</div>
									<Button
										type="button"
										size="small"
										variant="secondary"
										onClick={() => handleDelete(s.id, s.label)}
									>
										<Trash />
									</Button>
								</div>
							))}
						</div>
					)}

					{/* Create new secret */}
					<div className="flex flex-col gap-y-2 rounded-lg border border-ui-border-base p-4">
						<Heading level="h3" className="text-sm font-medium">Create New Secret</Heading>
						<div className="flex flex-col gap-y-1">
							<Label htmlFor="secret-label" size="small" weight="plus">Label</Label>
							<Text size="small" className="text-ui-fg-subtle">
								A human-readable name to identify this secret (e.g. "Shopify", "Slack").
							</Text>
							<div className="flex gap-x-2">
								<Input
									id="secret-label"
									placeholder="e.g. Shopify Webhook"
									value={newLabel}
									onChange={e => setNewLabel(e.target.value)}
									onKeyDown={e => e.key === 'Enter' && handleCreate()}
									className="flex-1"
								/>
								<Button
									type="button"
									size="small"
									onClick={handleCreate}
									isLoading={isCreating}
									disabled={!newLabel.trim() || isCreating}
								>
									<Plus /> Generate
								</Button>
							</div>
						</div>
					</div>
				</Drawer.Body>

				<Drawer.Footer>
					<Button type="button" variant="secondary" size="small" onClick={handleClose}>
						Close
					</Button>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer>
	)
}
