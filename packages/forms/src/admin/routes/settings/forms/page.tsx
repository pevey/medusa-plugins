import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { DocumentText } from '@medusajs/icons'
import {
	Badge,
	Button,
	Container,
	createDataTableColumnHelper,
	createDataTableCommandHelper,
	DataTable,
	DataTablePaginationState,
	DataTableRowSelectionState,
	DataTableSortingState,
	Heading,
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { CreateFormModal } from '../../../components/create-form-modal'
import { AdminForm } from '../../../types'
import { useFormsList, useDeleteForms } from '../../../hooks/forms'

export const config = defineRouteConfig({ label: 'Forms', icon: DocumentText, rank: 60 })
export const handle = { breadcrumb: () => 'Forms' }

const FormsPage = () => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')
	const [createOpen, setCreateOpen] = useState(false)

	const { data, isLoading } = useFormsList({
		limit,
		offset,
		q: search || undefined,
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined
	})
	const { mutateAsync: deleteForms } = useDeleteForms()

	const columnHelper = createDataTableColumnHelper<AdminForm>()
	const columns = [
		columnHelper.accessor('name', {
			header: 'Name',
			enableSorting: true,
			sortLabel: 'Name',
			sortAscLabel: 'A–Z',
			sortDescLabel: 'Z–A'
		}),
		columnHelper.accessor('handle', {
			header: 'Handle',
			cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>
		}),
		columnHelper.accessor('form_fields', {
			header: 'Fields',
			cell: ({ getValue }) => (getValue() as unknown[])?.length ?? 0
		}),
		columnHelper.accessor('active', {
			header: 'Status',
			cell: ({ getValue }) => (
				<Badge size="xsmall" color={getValue() ? 'green' : 'grey'}>
					{getValue() ? 'Active' : 'Inactive'}
				</Badge>
			)
		}),
		columnHelper.accessor('turnstile_enabled', {
			header: 'Turnstile',
			cell: ({ getValue }) => (
				<Badge size="xsmall" color={getValue() ? 'blue' : 'grey'}>
					{getValue() ? 'On' : 'Off'}
				</Badge>
			)
		})
	]

	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
	const commandHelper = createDataTableCommandHelper()
	const prompt = usePrompt()
	const useCommands = () => [
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} form${ids.length > 1 ? 's' : ''}?`,
					description: 'This will also delete all associated fields and submissions.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteForms(ids)
			}
		})
	]
	const commands = useCommands()

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.forms || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: (_, row) => navigate(`${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		sorting: { state: sorting, onSortingChange: setSorting },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
						<Heading>Forms</Heading>
						<div className="flex gap-2">
							<DataTable.Search placeholder="Search..." />
							<Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
								Create
							</Button>
						</div>
					</DataTable.Toolbar>
					<DataTable.Table />
					<DataTable.CommandBar selectedLabel={count => `${count} selected`} />
					<DataTable.Pagination />
				</DataTable>
			</Container>
			<CreateFormModal open={createOpen} setOpen={setCreateOpen} />
		</div>
	)
}

export default FormsPage
