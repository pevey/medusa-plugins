import { useMemo, useState } from 'react'
import { createDataTableColumnHelper, DataTable, DataTablePaginationState, DataTableRowSelectionState, useDataTable } from '@medusajs/ui'
import { useAccessPoliciesList } from '../hooks/policies'
import { AdminAccessPolicy } from '../types'

type PolicyPickerProps = {
	selection: DataTableRowSelectionState
	onSelectionChange: React.Dispatch<React.SetStateAction<DataTableRowSelectionState>>
}

const columnHelper = createDataTableColumnHelper<AdminAccessPolicy>()

const columns = [
	columnHelper.select(),
	columnHelper.accessor('key', { header: 'Key' }),
	columnHelper.accessor('resource', { header: 'Resource' }),
	columnHelper.accessor('operation', { header: 'Operation' }),
	columnHelper.accessor('description', {
		header: 'Description',
		cell: info => info.getValue() ?? '-'
	})
]

/**
 * Searchable, paginated checkbox table of the assignable policy catalog. The
 * selection map (policyId → boolean) is controlled by the parent so it can be
 * seeded (edit) or read back on save (create/edit).
 */
export const PolicyPicker = ({ selection, onSelectionChange }: PolicyPickerProps) => {
	const limit = 10
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [search, setSearch] = useState('')

	const { data, isLoading } = useAccessPoliciesList({ limit, offset, q: search })

	const table = useDataTable({
		columns,
		data: data?.policies || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		rowSelection: { state: selection, onRowSelectionChange: onSelectionChange },
		pagination: { state: pagination, onPaginationChange: setPagination },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<DataTable instance={table}>
			<DataTable.Toolbar className="flex justify-end">
				<DataTable.Search placeholder="Search policies..." />
			</DataTable.Toolbar>
			<DataTable.Table />
			<DataTable.Pagination />
		</DataTable>
	)
}
