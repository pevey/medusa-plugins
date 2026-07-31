import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
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
import { CreateRoleModal } from '../../../components/create-role-modal'
import { AdminAccessRole } from '../../../types'
import { useAccessRolesList, useDeleteAccessRoles } from '../../../hooks/roles'

export const config = defineRouteConfig({ label: 'Roles', rank: 1 })
export const handle = { breadcrumb: () => 'Roles' }

const RolesPage = () => {
	const [createOpen, setCreateOpen] = useState(false)
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')

	const { data, isLoading } = useAccessRolesList({
		limit,
		offset,
		q: search,
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined
	})
	const { mutateAsync: deleteRoles } = useDeleteAccessRoles()

	const columnHelper = createDataTableColumnHelper<AdminAccessRole>()
	const columns = [
		columnHelper.select(),
		columnHelper.accessor('name', {
			header: 'Name',
			enableSorting: true,
			sortLabel: 'Name',
			sortAscLabel: 'A-Z',
			sortDescLabel: 'Z-A'
		}),
		columnHelper.accessor('description', {
			header: 'Description',
			cell: info => info.getValue() ?? '-'
		}),
		columnHelper.accessor('created_at', {
			header: 'Created At',
			cell: info =>
				new Date(info.getValue()).toLocaleString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				}),
			enableSorting: true,
			sortLabel: 'Created At',
			sortAscLabel: 'Oldest first',
			sortDescLabel: 'Newest first'
		})
	]

	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
	const commandHelper = createDataTableCommandHelper()
	const prompt = usePrompt()
	const commands = [
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} role(s)?`,
					description: 'This action cannot be undone.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteRoles(ids)
				setRowSelection({})
			}
		})
	]
	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.roles || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: async (event, row) => navigate(`${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		sorting: { state: sorting, onSortingChange: setSorting },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
						<Heading>Roles</Heading>
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
			<CreateRoleModal open={createOpen} setOpen={setCreateOpen} />
		</div>
	)
}

export default RolesPage
