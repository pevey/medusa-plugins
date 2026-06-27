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
	toast,
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { AdminComplaint } from '../../types'
import { useComplaintsList, useDeleteComplaints, useGenerateComplaintsPdfExport } from '../../hooks/complaints'

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
	const [filtering, setFiltering] = useState<DataTableFilteringState>({ actionable: 'true' })
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')

	const { data, isLoading } = useComplaintsList({
		limit,
		offset,
		q: search,
		...(filtering.status !== undefined ? { status: filtering.status } : {}),
		...(filtering.actionable !== undefined ? { actionable: filtering.actionable } : {}),
		...(filtering.reportable !== undefined ? { reportable: filtering.reportable } : {}),
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined
	})
	const { mutateAsync: deleteComplaints } = useDeleteComplaints()
	const { mutateAsync: generatePdfExport } = useGenerateComplaintsPdfExport()

	const columnHelper = createDataTableColumnHelper<AdminComplaint>()
	const columns = [
		columnHelper.select(),
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
			label: 'Generate PDF',
			shortcut: 'G',
			action: async (selection, ctx) => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Generate PDF for ${ids.length} complaint${ids.length === 1 ? '' : 's'}?`,
					description:
						"A PDF will be generated in the background. You'll get a notification when it's ready to download.",
					confirmText: 'Generate',
					cancelText: 'Cancel',
					variant: 'confirmation'
				})
				if (!confirmed) return
				try {
					await generatePdfExport(ids)
					toast.success("PDF generation started — you'll be notified when it's ready.")
					ctx?.clearRowSelection?.()
				} catch {
					toast.error('Failed to start PDF generation.')
				}
			}
		}),
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
		}),
		filterHelper.accessor('actionable', {
			type: 'select',
			label: 'Actionable',
			options: [
				{ label: 'Yes', value: 'true' },
				{ label: 'No', value: 'false' }
			]
		}),
		filterHelper.accessor('reportable', {
			type: 'select',
			label: 'Reportable',
			options: [
				{ label: 'Yes', value: 'true' },
				{ label: 'No', value: 'false' }
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
