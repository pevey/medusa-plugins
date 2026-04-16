import {
	Container,
	createDataTableColumnHelper,
	DataTable,
	DataTablePaginationState,
	Heading,
	useDataTable
} from '@medusajs/ui'
import { useState, useMemo } from 'react'
import { AdminSerialNumber } from '../types'
import { useStockLotSerialNumbers } from '../hooks/stock-lots'

type SerialNumbersTableProps = {
	stockLotId: string
}

const columnHelper = createDataTableColumnHelper<AdminSerialNumber>()

const columns = [
	columnHelper.accessor('value', {
		header: 'Serial Number'
	}),
	columnHelper.accessor('order_id', {
		header: 'Order ID'
	}),
	columnHelper.accessor('created_at', {
		header: 'Created At',
		cell: ({ getValue }) => new Date(getValue()).toLocaleDateString()
	})
]

export const SerialNumbersTable = ({ stockLotId }: SerialNumbersTableProps) => {
	const limit = 10
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})

	const offset = useMemo(() => {
		return pagination.pageIndex * limit
	}, [pagination])

	const { data, isLoading } = useStockLotSerialNumbers(stockLotId, { limit, offset })

	const table = useDataTable({
		columns,
		data: data?.serial_numbers || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		pagination: {
			state: pagination,
			onPaginationChange: setPagination
		}
	})

	return (
		<Container className="divide-y p-0">
			<DataTable instance={table}>
				<DataTable.Toolbar className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Serial Numbers</Heading>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
		</Container>
	)
}
