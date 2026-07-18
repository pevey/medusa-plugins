import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
	Container,
	createDataTableColumnHelper,
	DataTable,
	DataTablePaginationState,
	DataTableSortingState,
	Heading,
	useDataTable
} from '@medusajs/ui'
import { AdminAccessPolicy } from '../../../types'
import { useAccessPoliciesList } from '../../../hooks/policies'

export const config = defineRouteConfig({ label: 'Policies', rank: 2 })
export const handle = { breadcrumb: () => 'Policies' }

// Policies are read-only: they are defined in code and synced to the DB on
// startup, so there is no create/edit/delete UI.
const PoliciesPage = () => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')

	const { data, isLoading } = useAccessPoliciesList({ limit, offset, q: search })

	const columnHelper = createDataTableColumnHelper<AdminAccessPolicy>()
	const columns = [
		columnHelper.accessor('key', {
			header: 'Key',
			enableSorting: true,
			sortLabel: 'Key',
			sortAscLabel: 'A-Z',
			sortDescLabel: 'Z-A'
		}),
		columnHelper.accessor('resource', { header: 'Resource' }),
		columnHelper.accessor('operation', { header: 'Operation' }),
		columnHelper.accessor('description', {
			header: 'Description',
			cell: info => info.getValue() ?? '-'
		})
	]

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.policies || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
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
						<Heading>Policies</Heading>
						<DataTable.Search placeholder="Search..." />
					</DataTable.Toolbar>
					<DataTable.Table />
					<DataTable.Pagination />
				</DataTable>
			</Container>
		</div>
	)
}

export default PoliciesPage
