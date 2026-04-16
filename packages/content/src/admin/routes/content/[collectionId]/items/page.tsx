import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	Badge,
	Button,
	Container,
	createDataTableColumnHelper,
	createDataTableCommandHelper,
	DataTable,
	DataTablePaginationState,
	DataTableRowSelectionState,
	Heading,
	Text,
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'
import { AdminContentItem, ContentFormat } from '../../../../types'
import {
	useContentCollection,
	useContentItems,
	useDeleteContentItems
} from '../../../../hooks/content'
import { CreateContentItemModal } from '../../../../components/create-content-item-modal'

export const handle = { breadcrumb: () => 'Items' }

const STATUS_COLORS: Record<string, 'green' | 'orange' | 'grey'> = {
	published: 'green',
	draft: 'orange',
	archived: 'grey'
}

const columnHelper = createDataTableColumnHelper<AdminContentItem>()
const commandHelper = createDataTableCommandHelper()

// ── Gallery view for IMG content collections ─────────────────────────────────────────

const GalleryView = ({
	collectionId,
	items,
	isLoading,
	onDelete
}: {
	collectionId: string
	items: AdminContentItem[]
	isLoading: boolean
	onDelete: (ids: string[]) => void
}) => {
	const navigate = useNavigate()
	const prompt = usePrompt()

	if (isLoading) {
		return <Text className="text-ui-fg-muted px-6 py-4">Loading...</Text>
	}

	if (items.length === 0) {
		return (
			<Text className="text-ui-fg-muted px-6 py-8 text-center">
				No images yet. Upload one to get started.
			</Text>
		)
	}

	return (
		<div className="flex flex-wrap gap-4 p-6">
			{items.map(item => (
				<div
					key={item.id}
					className="group relative flex-none flex flex-col overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle cursor-pointer"
					onClick={() => navigate(`/content/${collectionId}/items/${item.id}`)}
				>
					{item.body ? (
						<img
							src={item.body}
							alt={item.title}
							className="block h-40 w-auto object-contain bg-ui-bg-component transition-transform group-hover:scale-105"
						/>
					) : (
						<div className="flex h-40 w-32 items-center justify-center bg-ui-bg-component">
							<Text className="text-ui-fg-muted text-sm">No image</Text>
						</div>
					)}
					<div className="w-0 min-w-full overflow-hidden p-2">
						<Text size="small" weight="plus" className="truncate">
							{item.title}
						</Text>
						<Badge
							size="xsmall"
							color={STATUS_COLORS[item.status] ?? 'grey'}
							className="mt-1"
						>
							{item.status}
						</Badge>
					</div>
					<button
						className="absolute right-1 top-1 hidden rounded bg-black/50 p-1 text-white group-hover:flex items-center"
						onClick={async e => {
							e.stopPropagation()
							const confirmed = await prompt({
								title: 'Delete image?',
								description: 'This cannot be undone.',
								confirmText: 'Delete',
								cancelText: 'Cancel'
							})
							if (confirmed) onDelete([item.id])
						}}
					>
						<Trash className="h-3 w-3" />
					</button>
				</div>
			))}
		</div>
	)
}

// ── Main page ──────────────────────────────────────────────────────────────────

const ContentItemsPage = () => {
	const { collectionId } = useParams<{ collectionId: string }>()
	const navigate = useNavigate()
	const prompt = usePrompt()
	const limit = 20
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const [search, setSearch] = useState('')
	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
	const [createOpen, setCreateOpen] = useState(false)

	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data: collectionData, isLoading: collectionLoading } = useContentCollection(collectionId)
	const contentCollection = collectionData?.content_collection

	const { data, isLoading } = useContentItems(collectionId, {
		limit,
		offset,
		q: search || undefined
	})

	const { mutate: deleteItems } = useDeleteContentItems(collectionId!)

	const isGallery = contentCollection?.format === ('img' as ContentFormat)

	const columns = [
		columnHelper.accessor('title', { header: 'Title', enableSorting: false }),
		columnHelper.accessor('status', {
			header: 'Status',
			cell: ({ getValue }) => (
				<Badge size="xsmall" color={STATUS_COLORS[getValue()] ?? 'grey'}>
					{getValue()}
				</Badge>
			)
		}),
		columnHelper.accessor('published_at', {
			header: 'Published',
			cell: ({ getValue }) => {
				const v = getValue()
				return v ? (
					<Text size="small">{new Date(v).toLocaleDateString()}</Text>
				) : (
					<span className="text-ui-fg-muted">—</span>
				)
			}
		}),
		columnHelper.accessor('slug', {
			header: 'Slug',
			cell: ({ getValue }) => (
				<span className="text-ui-fg-muted font-mono text-sm">{getValue()}</span>
			)
		})
	]

	const commands = [
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`,
					description: 'This cannot be undone.',
					confirmText: 'Delete',
					cancelText: 'Cancel'
				})
				if (confirmed) {
					deleteItems(ids, { onSuccess: () => setRowSelection({}) })
				}
			}
		})
	]

	const table = useDataTable({
		columns,
		data: data?.content_items ?? [],
		getRowId: row => row.id,
		rowCount: data?.count ?? 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: (_, row) => navigate(`/content/${collectionId}/items/${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		search: { state: search, onSearchChange: setSearch }
	})

	if (collectionLoading) {
		return (
			<Container className="p-6">
				<Text className="text-ui-fg-muted">Loading...</Text>
			</Container>
		)
	}

	if (!contentCollection) {
		return (
			<Container className="p-6">
				<Text className="text-ui-fg-error">Content collection not found.</Text>
			</Container>
		)
	}

	return (
		<>
			<Container className="divide-y p-0">
				{isGallery ? (
					<>
						<div className="flex flex-col items-start justify-between gap-2 px-6 py-4 md:flex-row md:items-center">
							<Heading>{contentCollection.label}</Heading>
							<div className="flex gap-2 justify-between">
								<Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
									<Plus className="mr-1" />
									Upload
								</Button>
							</div>
						</div>
						<GalleryView
							collectionId={collectionId!}
							items={data?.content_items ?? []}
							isLoading={isLoading}
							onDelete={ids => deleteItems(ids)}
						/>
					</>
				) : (
					<DataTable instance={table}>
						<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
							<Heading>{contentCollection.label}</Heading>
							<div className="flex gap-2 justify-between">
								<DataTable.Search placeholder="Search..." />
								<Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
									<Plus className="mr-1" />
									Create
								</Button>
							</div>
						</DataTable.Toolbar>
						<DataTable.Table />
						<DataTable.CommandBar selectedLabel={n => `${n} selected`} />
						<DataTable.Pagination />
					</DataTable>
				)}
			</Container>

			{collectionId && (
				<CreateContentItemModal
					open={createOpen}
					onOpenChange={setCreateOpen}
					contentCollection={contentCollection}
				/>
			)}
		</>
	)
}

export default ContentItemsPage
