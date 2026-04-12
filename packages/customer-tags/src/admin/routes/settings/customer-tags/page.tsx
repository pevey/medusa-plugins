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
import { CreateCustomerTagModal } from '../../../components/create-customer-tag-modal'
import { AdminCustomerTag } from '../../../types'
import { useCustomerTagsList, useDeleteCustomerTags } from '../../../hooks/customer-tags'

export const config = defineRouteConfig({ label: 'Customer Tags', rank: 2 })
export const handle = { breadcrumb: () => 'Customer Tags' }

const CustomerTagsPage = () => {
	const [createOpen, setCreateOpen] = useState(false)
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')

	const { data, isLoading } = useCustomerTagsList({ limit, offset, q: search })
	const { mutateAsync: deleteCustomerTags } = useDeleteCustomerTags()

	const columnHelper = createDataTableColumnHelper<AdminCustomerTag>()
	const columns = [
		columnHelper.accessor('value', {
			header: 'Value',
			enableSorting: true,
			sortLabel: 'Value',
			sortAscLabel: 'Value Ascending',
			sortDescLabel: 'Value Descending'
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
			sortAscLabel: 'Created At Ascending',
			sortDescLabel: 'Created At Descending'
		}),
		columnHelper.accessor('updated_at', {
			header: 'Updated At',
			cell: info =>
				new Date(info.getValue()).toLocaleString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				}),
			enableSorting: true,
			sortLabel: 'Updated At',
			sortAscLabel: 'Updated At Ascending',
			sortDescLabel: 'Updated At Descending'
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
					title: `Delete ${ids.length} customer tags?`,
					description: 'This action cannot be undone.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteCustomerTags(ids)
			}
		})
	]
	const commands = useCommands()
	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.customer_tags || [],
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
						<Heading>Customer Tags</Heading>
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
			<CreateCustomerTagModal open={createOpen} setOpen={setCreateOpen} />
		</div>
	)
}

export default CustomerTagsPage
