import { Button, IconButton, Text, usePrompt } from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'
import { useDeleteSession, useSessions, type SessionSummary } from '../hooks/sessions'

export type SessionSidebarProps = {
	activeId: string | null
	onNew: () => void
	onSelect: (id: string) => void
	disabled?: boolean
}

// Small self-contained relative-time formatter — this plugin has no
// date-fns dependency, and pulling one in just for "3h ago" labels isn't
// worth it.
const formatRelativeTime = (iso: string): string => {
	const then = new Date(iso).getTime()
	if (Number.isNaN(then)) return ''

	const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000))
	const diffMin = Math.round(diffSec / 60)
	const diffHour = Math.round(diffMin / 60)
	const diffDay = Math.round(diffHour / 24)

	if (diffSec < 60) return 'just now'
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHour < 24) return `${diffHour}h ago`
	if (diffDay < 7) return `${diffDay}d ago`
	return new Date(iso).toLocaleDateString()
}

const SessionRow = ({
	session,
	active,
	disabled,
	onSelect,
	onDelete
}: {
	session: SessionSummary
	active: boolean
	disabled?: boolean
	onSelect: (id: string) => void
	onDelete: (id: string) => void
}) => (
	<div
		onClick={() => {
			if (disabled) return
			onSelect(session.id)
		}}
		aria-disabled={disabled}
		className={`group flex items-center gap-2 rounded-md px-2.5 py-2 ${
			disabled ? 'cursor-not-allowed' : 'cursor-pointer'
		} ${active ? 'bg-ui-bg-base-pressed' : disabled ? '' : 'hover:bg-ui-bg-base-hover'}`}
	>
		<div className="flex-1 min-w-0">
			<Text size="small" leading="compact" className="truncate text-ui-fg-base">
				{session.title || 'Untitled chat'}
			</Text>
			<Text size="xsmall" leading="compact" className="text-ui-fg-muted">
				{formatRelativeTime(session.last_message_at)}
			</Text>
		</div>
		<IconButton
			size="small"
			variant="transparent"
			className="opacity-0 group-hover:opacity-100"
			disabled={disabled}
			onClick={(e) => {
				e.stopPropagation()
				if (disabled) return
				onDelete(session.id)
			}}
		>
			<Trash />
		</IconButton>
	</div>
)

export const SessionSidebar = ({ activeId, onNew, onSelect, disabled }: SessionSidebarProps) => {
	const { data } = useSessions()
	const deleteSession = useDeleteSession()
	const prompt = usePrompt()

	const sessions = [...(data?.sessions ?? [])].sort(
		(a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
	)

	const handleDelete = async (id: string) => {
		if (disabled) return
		const confirmed = await prompt({
			title: 'Delete chat?',
			description: 'This will permanently delete this chat and its messages.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (!confirmed) return

		await deleteSession.mutateAsync(id)
		if (id === activeId) onNew()
	}

	return (
		<div className="flex flex-col h-full w-64 shrink-0 border-r border-ui-border-base">
			<div className="px-3 py-3 border-b border-ui-border-base">
				<Button size="small" variant="secondary" className="w-full" onClick={onNew} disabled={disabled}>
					<Plus />
					New chat
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
				{sessions.length === 0 && (
					<div className="px-1 py-2">
						<Text size="small" className="text-ui-fg-muted">
							No chats yet.
						</Text>
					</div>
				)}
				{sessions.map((session) => (
					<SessionRow
						key={session.id}
						session={session}
						active={session.id === activeId}
						disabled={disabled}
						onSelect={onSelect}
						onDelete={handleDelete}
					/>
				))}
			</div>
		</div>
	)
}
