import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
	Button,
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
import { CreateStockLotModal } from '../../components/create-stock-lot-modal'
import { AdminStockLot } from '../../types'
import {
	useStockLotsList,
	useEnableStockLots,
	useDisableStockLots,
	useDeleteStockLots
} from '../../hooks/stock-lots'

export const config = defineRouteConfig({ label: 'Stock Lots', nested: '/inventory', rank: 1 })
export const handle = { breadcrumb: () => 'Stock Lots' }

const StockLotsPage = () => {
	const [createOpen, setCreateOpen] = useState(false)
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [filtering, setFiltering] = useState<DataTableFilteringState>({})
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')

	const { data, isLoading } = useStockLotsList({
		limit,
		offset,
		q: search,
		...(filtering.enabled !== undefined ? { enabled: filtering.enabled } : {}),
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined,
		fields: '*inventory_item,*stock_location'
	})
	const { mutateAsync: enableStockLots } = useEnableStockLots()
	const { mutateAsync: disableStockLots } = useDisableStockLots()
	const { mutateAsync: deleteStockLots } = useDeleteStockLots()

	const columnHelper = createDataTableColumnHelper<AdminStockLot>()
	const columns = [
		columnHelper.select(),
		columnHelper.accessor('lot_number', {
			header: 'Lot Number',
			enableSorting: true,
			sortLabel: 'Lot Number',
			sortAscLabel: 'Lot Number Ascending',
			sortDescLabel: 'Lot Number Descending'
		}),
		columnHelper.accessor('inventory_item.title', { header: 'Item', enableSorting: false }),
		columnHelper.accessor('stock_location.name', { header: 'Location', enableSorting: false }),
		columnHelper.accessor('stocked_quantity', {
			header: 'Stocked Quantity',
			enableSorting: true,
			sortLabel: 'Stocked Quantity',
			sortAscLabel: 'Stocked Quantity Ascending',
			sortDescLabel: 'Stocked Quantity Descending'
		}),
		columnHelper.accessor('enabled', {
			header: 'Status',
			cell: ({ getValue }) => (getValue() ? 'Enabled' : 'Disabled'),
			enableSorting: true,
			sortLabel: 'Status',
			sortAscLabel: 'Status Ascending',
			sortDescLabel: 'Status Descending'
		})
	]

	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
	const commandHelper = createDataTableCommandHelper()
	const prompt = usePrompt()
	const useCommands = () => [
		commandHelper.command({
			label: 'Enable',
			shortcut: 'E',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Enable ${ids.length} stock lots?`,
					description: 'You have unsaved changes that will be lost if you exit this form.',
					confirmText: 'Continue',
					cancelText: 'Cancel',
					variant: 'confirmation'
				})
				if (!confirmed) return
				await enableStockLots(ids)
			}
		}),
		commandHelper.command({
			label: 'Disable',
			shortcut: 'D',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Disable ${ids.length} stock lots?`,
					description: 'You have unsaved changes that will be lost if you exit this form.',
					confirmText: 'Continue',
					cancelText: 'Cancel',
					variant: 'confirmation'
				})
				if (!confirmed) return
				await disableStockLots(ids)
			}
		}),
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} stock lots?`,
					description: 'This action cannot be undone.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteStockLots(ids)
			}
		})
	]
	const commands = useCommands()

	const filterHelper = createDataTableFilterHelper<AdminStockLot>()
	const filters = [
		filterHelper.accessor('inventory_item_id', { type: 'string', label: 'Inventory Item' }),
		filterHelper.accessor('stock_location_id', { type: 'string', label: 'Stock Location' }),
		filterHelper.accessor('enabled', {
			type: 'select',
			label: 'Status',
			options: [
				{ label: 'Enabled', value: 'true' },
				{ label: 'Disabled', value: 'false' }
			]
		})
	]

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.stock_lots || [],
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
						<Heading>Stock Lots</Heading>
						<div className="flex gap-2 justify-between">
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
			<CreateStockLotModal open={createOpen} setOpen={setCreateOpen} />
		</div>
	)
}

export default StockLotsPage
