import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Badge,
	Button,
	Container,
	createDataTableColumnHelper,
	DataTable,
	DataTablePaginationState,
	Heading,
	useDataTable
} from '@medusajs/ui'
import { useRubrics } from '../../../hooks/analytics'
import type { AdminRubric } from '../../../types/analytics'
import { CreateRubricModal } from '../../../components/create-rubric-modal'

export const handle = { breadcrumb: () => 'Event Rubrics' }

const columnHelper = createDataTableColumnHelper<AdminRubric>()

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: true,
		sortLabel: 'Name',
		sortAscLabel: 'Name Ascending',
		sortDescLabel: 'Name Descending'
	}),
	columnHelper.accessor('label', { header: 'Label' }),
	columnHelper.accessor('active', {
		header: 'Status',
		cell: ({ getValue }) => (
			<Badge color={getValue() ? 'green' : 'grey'} size="small">
				{getValue() ? 'Active' : 'Inactive'}
			</Badge>
		)
	}),
	columnHelper.accessor('created_at', {
		header: 'Created',
		cell: ({ getValue }) => {
			const val = getValue()
			return val ? new Date(val).toLocaleDateString() : ''
		}
	})
]

const RubricsPage = () => {
	const [createOpen, setCreateOpen] = useState(false)
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [search, setSearch] = useState('')

	const { data, isLoading } = useRubrics({ limit, offset, q: search || undefined })

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.rubrics || [],
		getRowId: row => row.id,
		isLoading,
		onRowClick: async (_, row) => navigate(`${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
						<Heading>Event Rubrics</Heading>
						<div className="flex gap-2 justify-between">
							<Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
								Create
							</Button>
						</div>
					</DataTable.Toolbar>
					<DataTable.Table />
					<DataTable.Pagination />
				</DataTable>
			</Container>
			<CreateRubricModal open={createOpen} setOpen={setCreateOpen} />
		</div>
	)
}

export default RubricsPage
