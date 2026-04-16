import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { PencilSquare } from '@medusajs/icons'
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
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { AdminContentCollection, ContentFormat } from '../../types'
import { useContentCollections, useDeleteContentCollections } from '../../hooks/content'
import { CreateContentCollectionModal } from '../../components/create-content-collection-modal'

export const config = defineRouteConfig({
	label: 'Content',
	icon: PencilSquare,
	rank: 6
})
export const handle = { breadcrumb: () => 'Content' }

const FORMAT_LABELS: Record<ContentFormat, string> = {
	html: 'HTML',
	img: 'Image',
	json: 'JSON',
	md: 'Markdown',
	text: 'Text'
}

const FORMAT_COLORS: Record<ContentFormat, 'blue' | 'green' | 'orange' | 'purple' | 'grey'> = {
	html: 'orange',
	img: 'blue',
	json: 'purple',
	md: 'green',
	text: 'grey'
}

const columnHelper = createDataTableColumnHelper<AdminContentCollection>()
const commandHelper = createDataTableCommandHelper()

const ContentCollectionsPage = () => {
	const limit = 15
	const navigate = useNavigate()
	const prompt = usePrompt()
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const [search, setSearch] = useState('')
	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
	const [createOpen, setCreateOpen] = useState(false)

	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data, isLoading } = useContentCollections({
		limit,
		offset,
		q: search || undefined
	})

	const { mutate: deleteContentCollections } = useDeleteContentCollections()

	const columns = [
		columnHelper.accessor('label', { header: 'Label', enableSorting: false }),
		columnHelper.accessor('format', {
			header: 'Format',
			cell: ({ getValue }) => {
				const fmt = getValue() as ContentFormat
				return (
					<Badge size="xsmall" color={FORMAT_COLORS[fmt] ?? 'grey'}>
						{FORMAT_LABELS[fmt] ?? fmt}
					</Badge>
				)
			}
		}),
		columnHelper.accessor('slug', {
			header: 'Slug',
			cell: ({ getValue }) => (
				<span className="text-ui-fg-muted font-mono text-sm">{getValue()}</span>
			)
		}),
		columnHelper.accessor('prefix', {
			header: 'Prefix',
			cell: ({ getValue }) => {
				const v = getValue()
				return v ? (
					<span className="text-ui-fg-muted font-mono text-sm">{v}</span>
				) : (
					<span className="text-ui-fg-muted">—</span>
				)
			}
		})
	]

	const commands = [
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} content collection${ids.length > 1 ? 's' : ''}?`,
					description:
						'This will permanently delete the selected content collections and all their items.',
					confirmText: 'Delete',
					cancelText: 'Cancel'
				})
				if (confirmed) {
					deleteContentCollections(ids, {
						onSuccess: () => setRowSelection({})
					})
				}
			}
		})
	]

	const table = useDataTable({
		columns,
		data: data?.content_collections ?? [],
		getRowId: row => row.id,
		rowCount: data?.count ?? 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: (_, row) => navigate(`/content/${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<>
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
						<Heading>Content Collections</Heading>
						<div className="flex gap-2 justify-between">
							<DataTable.Search placeholder="Search..." />
							<Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
								Create
							</Button>
						</div>
					</DataTable.Toolbar>
					<DataTable.Table />
					<DataTable.CommandBar selectedLabel={n => `${n} selected`} />
					<DataTable.Pagination />
				</DataTable>
			</Container>
			<CreateContentCollectionModal open={createOpen} onOpenChange={setCreateOpen} />
		</>
	)
}

export default ContentCollectionsPage
