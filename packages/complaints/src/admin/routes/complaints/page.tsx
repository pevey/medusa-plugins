import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { FaceDisappointed } from '@medusajs/icons'
import {
	Badge,
	Container,
	createDataTableColumnHelper,
	createDataTableCommandHelper,
	createDataTableFilterHelper,
	DataTable,
	DataTableFilteringState,
	DataTablePaginationState,
	DataTableRowSelectionState,
	DataTableSortingState,
	Heading,
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { AdminComplaint } from '../../types'
import { useComplaintsList, useDeleteComplaints } from '../../hooks/complaints'

export const config = defineRouteConfig({
	label: 'Complaints',
	icon: FaceDisappointed,
	rank: 5
})
export const handle = { breadcrumb: () => 'Complaints' }

const ComplaintsPage = () => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [filtering, setFiltering] = useState<DataTableFilteringState>({})
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')

	const { data, isLoading } = useComplaintsList({
		limit,
		offset,
		q: search,
		...(filtering.enabled !== undefined ? { enabled: filtering.enabled } : {}),
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined
	})
	const { mutateAsync: deleteComplaints } = useDeleteComplaints()

	const columnHelper = createDataTableColumnHelper<AdminComplaint>()
	const columns = [
		columnHelper.accessor('number', {
			header: 'Number',
			enableSorting: true,
			sortLabel: 'Number',
			sortAscLabel: 'Number Ascending',
			sortDescLabel: 'Number Descending'
		}),
		columnHelper.accessor('status', {
			header: 'Status',
			enableSorting: true,
			sortLabel: 'Status',
			sortAscLabel: 'Status Ascending',
			sortDescLabel: 'Status Descending',
			cell: ({ getValue }) => {
				const status = getValue()
				return (
					<Badge size="xsmall" color={status === 'open' ? 'orange' : 'grey'}>
						{status}
					</Badge>
				)
			}
		}),
		columnHelper.accessor('description', {
			header: 'Description',
			cell: ({ getValue }) => {
				const description = getValue() as string
				return description.length > 40 ? `${description.slice(0, 40)}...` : description
			}
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
					title: `Delete ${ids.length} complaints?`,
					description: 'This action cannot be undone.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteComplaints(ids)
			}
		})
	]
	const commands = useCommands()

	const filterHelper = createDataTableFilterHelper<AdminComplaint>()
	const filters = [
		filterHelper.accessor('status', {
			type: 'select',
			label: 'Status',
			options: [
				{ label: 'Open', value: 'open' },
				{ label: 'Closed', value: 'closed' }
			]
		})
	]

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.complaints || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: async (event, row) => navigate(`${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		filtering: { state: filtering, onFilteringChange: setFiltering },
		filters,
		sorting: { state: sorting, onSortingChange: setSorting },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
						<Heading>Complaints</Heading>
						<div className="flex gap-2">
							<DataTable.Search placeholder="Search..." />
						</div>
					</DataTable.Toolbar>
					<DataTable.Table />
					<DataTable.CommandBar selectedLabel={count => `${count} selected`} />
					<DataTable.Pagination />
				</DataTable>
			</Container>
		</div>
	)
}

export default ComplaintsPage
