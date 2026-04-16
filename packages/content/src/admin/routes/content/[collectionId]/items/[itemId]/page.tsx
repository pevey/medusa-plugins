import { useCallback, useEffect, useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
	Badge,
	Button,
	Container,
	Heading,
	Label,
	Text,
	Textarea,
	toast,
	Tooltip,
	usePrompt
} from '@medusajs/ui'
import { ArchiveBox, PaperPlane, PencilSquare, Trash } from '@medusajs/icons'
import { ContentStatus } from '../../../../../types'
import {
	useContentItem,
	useDeleteContentItems,
	useUpdateContentItem
} from '../../../../../hooks/content'
import { ActionMenu } from '../../../../../components/action-menu'
import { ContentMarkdownEditor } from '../../../../../components/content-markdown-editor'
import { EditContentItemDrawer } from '../../../../../components/edit-content-item-drawer'
import { sdk } from '../../../../../lib/sdk'

type ContentItemLoaderData = { content_item: { id: string; title: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { itemId } = params
	return sdk.client.fetch<ContentItemLoaderData>(`/admin/content-items/${itemId}`, {
		query: { fields: 'id,title' }
	})
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<ContentItemLoaderData>) =>
		data?.content_item?.title || data?.content_item?.id || 'Item'
}

const STATUS_COLORS: Record<string, 'green' | 'orange' | 'grey'> = {
	published: 'green',
	draft: 'orange',
	archived: 'grey'
}

// ── Main page ──────────────────────────────────────────────────────────────────

const ContentItemEditorPage = () => {
	const { collectionId, itemId } = useParams<{ collectionId: string; itemId: string }>()
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useContentItem(collectionId, itemId)
	const { mutate: updateItem, isPending } = useUpdateContentItem(collectionId!, itemId!)
	const { mutate: deleteItems } = useDeleteContentItems(collectionId!)

	const item = data?.content_item
	const format = item?.content_collection?.format

	const [body, setBody] = useState('')
	const [status, setStatus] = useState<ContentStatus>('draft')
	const [initialized, setInitialized] = useState(false)
	const [editOpen, setEditOpen] = useState(false)

	if (item && !initialized) {
		setBody(item.body ?? '')
		setStatus(item.status)
		setInitialized(true)
	}

	const isDirty = initialized && format !== 'img' && body !== (item?.body ?? '')

	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			isDirty && currentLocation.pathname !== nextLocation.pathname
	)

	useEffect(() => {
		if (blocker.state === 'blocked') {
			prompt({
				title: 'Leave without saving?',
				description: 'You have unsaved changes that will be lost.',
				confirmText: 'Leave',
				cancelText: 'Stay',
				variant: 'danger'
			}).then(confirmed => {
				if (blocker.state !== 'blocked') return
				if (confirmed) {
					blocker.proceed()
				} else {
					blocker.reset()
				}
			})
		}
	}, [blocker])

	const handleSave = useCallback(() => {
		updateItem(
			{ body: body || null },
			{
				onSuccess: () => toast.success('Saved'),
				onError: () => toast.error('Failed to save')
			}
		)
	}, [body, updateItem])

	const handlePublish = useCallback(() => {
		const newStatus = status === 'published' ? 'archived' : 'published'
		updateItem(
			{
				status: newStatus,
				published_at: newStatus === 'published' ? new Date().toISOString() : null
			},
			{
				onSuccess: () => {
					setStatus(newStatus)
					toast.success(newStatus === 'published' ? 'Published' : 'Archived')
				},
				onError: () => toast.error('Failed to update status')
			}
		)
	}, [status, updateItem])

	const handleDelete = useCallback(async () => {
		const confirmed = await prompt({
			title: `Delete "${item?.title}"?`,
			description: 'This cannot be undone.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (confirmed) {
			deleteItems([itemId!], {
				onSuccess: () => {
					toast.success('Item deleted')
					navigate(`/content/${collectionId}/items`)
				},
				onError: () => toast.error('Failed to delete item')
			})
		}
	}, [item, itemId, collectionId, deleteItems, navigate, prompt])

	if (isLoading) {
		return (
			<Container className="p-6">
				<Text className="text-ui-fg-muted">Loading...</Text>
			</Container>
		)
	}

	if (!item) {
		return (
			<Container className="p-6">
				<Text className="text-ui-fg-error">Item not found.</Text>
			</Container>
		)
	}

	return (
		<div className="flex flex-col gap-y-4">
			{/* Header */}
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<div className="flex items-center gap-x-2">
						<Heading>{item.title}</Heading>
						<Badge size="small" color={STATUS_COLORS[status] ?? 'grey'}>
							{status}
						</Badge>
					</div>
					<ActionMenu
						groups={[
							{
								actions: [
									{
										label: 'Edit',
										icon: <PencilSquare />,
										onClick: () => setEditOpen(true)
									},
									{
										label: status === 'published' ? 'Archive' : 'Publish',
										icon: status === 'published' ? <ArchiveBox /> : <PaperPlane />,
										onClick: handlePublish
									},
									{ label: 'Delete', icon: <Trash />, onClick: handleDelete }
								]
							}
						]}
					/>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Title
					</Text>
					<Text size="small" leading="compact">
						{item.title}
					</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Slug
					</Text>
					<Text size="small" leading="compact">
						{item.slug}
					</Text>
				</div>
				{format === 'img' && item.body && (
					<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
						<Text size="small" weight="plus" leading="compact">
							URL
						</Text>
						<Tooltip
							content={item.body}
							maxWidth={400}
							onClick={() => {
								navigator.clipboard.writeText(item.body!)
								toast.success('URL copied')
							}}
						>
							<Text
								size="small"
								leading="compact"
								className="cursor-pointer truncate font-mono max-w-xs"
							>
								{item.body}
							</Text>
						</Tooltip>
					</div>
				)}
			</Container>

			{format === 'img' ? (
				// ── Image item ─────────────────────────────────────────────────────
				<Container className="p-6 flex items-center justify-center bg-ui-bg-subtle min-h-64">
					{item.body ? (
						<img
							src={item.body}
							alt={item.title}
							className="max-h-[60vh] max-w-full rounded-lg object-contain shadow"
						/>
					) : (
						<Text className="text-ui-fg-muted">No image</Text>
					)}
				</Container>
			) : (
				// ── Text / Markdown / HTML / JSON item ─────────────────────────────
				<>
					{format === 'md' ? (
						<ContentMarkdownEditor
							value={body}
							onChange={setBody}
							onSave={handleSave}
							isSaving={isPending}
						/>
					) : (
						<Container className="p-6 flex flex-col gap-y-4">
							<div className="flex flex-col gap-y-1">
								<div className="flex items-center justify-between mb-1">
									{/* <Label className="text-ui-fg-subtle">Body</Label> */}
									<Button size="small" onClick={handleSave} isLoading={isPending}>
										Save
									</Button>
								</div>
								<Textarea
									value={body}
									onChange={e => setBody(e.target.value)}
									rows={20}
									className="font-mono text-sm"
									placeholder={
										format === 'json'
											? '{ "key": "value" }'
											: format === 'html'
												? '<p>Your content here</p>'
												: 'Your content here...'
									}
								/>
							</div>
						</Container>
					)}
				</>
			)}

			<EditContentItemDrawer item={item} open={editOpen} onOpenChange={setEditOpen} />
		</div>
	)
}

export default ContentItemEditorPage
