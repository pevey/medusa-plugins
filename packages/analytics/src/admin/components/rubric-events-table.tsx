import {
	Badge,
	Container,
	createDataTableColumnHelper,
	DataTable,
	DataTablePaginationState,
	Heading,
	useDataTable
} from '@medusajs/ui'
import { useState, useMemo } from 'react'
import type { AdminEvent } from '../types/analytics'
import { useEvents } from '../hooks/analytics'

type RubricEventsTableProps = {
	rubricName: string
}

const columnHelper = createDataTableColumnHelper<AdminEvent>()

const columns = [
	columnHelper.accessor('actor_id', {
		header: 'Actor',
		cell: ({ getValue }) => getValue() || '—'
	}),
	columnHelper.accessor('source', {
		header: 'Source',
		cell: ({ getValue }) => (
			<Badge color={getValue() === 'storefront' ? 'blue' : 'purple'} size="small">
				{getValue()}
			</Badge>
		)
	}),
	columnHelper.accessor('sales_channel_id', {
		header: 'Channel',
		cell: ({ getValue }) => getValue() || '—'
	}),
	columnHelper.accessor('timestamp', {
		header: 'Timestamp',
		cell: ({ getValue }) => new Date(getValue()).toLocaleString()
	})
]

export const RubricEventsTable = ({ rubricName }: RubricEventsTableProps) => {
	const limit = 10
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})

	const offset = useMemo(() => {
		return pagination.pageIndex * limit
	}, [pagination])

	const { data, isLoading } = useEvents({ event: rubricName, limit, offset })

	const table = useDataTable({
		columns,
		data: data?.events || [],
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
					<Heading level="h2">Events</Heading>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
		</Container>
	)
}
