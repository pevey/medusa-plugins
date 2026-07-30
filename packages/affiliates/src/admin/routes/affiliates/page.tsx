import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { UserGroup } from '@medusajs/icons'
import {
	Badge,
	Button,
	Container,
	createDataTableColumnHelper,
	createDataTableFilterHelper,
	DataTable,
	DataTableFilteringState,
	DataTablePaginationState,
	DataTableSortingState,
	Heading,
	useDataTable
} from '@medusajs/ui'
import { AdminAffiliate } from '../../types'
import { useAffiliatesList } from '../../hooks/affiliates'
import { CreateAffiliateModal } from '../../components/create-affiliate-modal'

export const config = defineRouteConfig({
	label: 'Affiliates',
	icon: UserGroup,
	rank: 1
})
export const handle = { breadcrumb: () => 'Affiliates' }

const STATUS_COLOR: Record<string, 'green' | 'orange' | 'grey'> = {
	active: 'green',
	restricted: 'orange',
	inactive: 'grey'
}

const AffiliatesPage = () => {
	const navigate = useNavigate()
	const limit = 20
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [filtering, setFiltering] = useState<DataTableFilteringState>({})
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')
	const [createOpen, setCreateOpen] = useState(false)

	const { data, isLoading } = useAffiliatesList({
		limit,
		offset,
		q: search,
		...(filtering.status !== undefined ? { status: filtering.status } : {}),
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined
	})

	const colHelper = createDataTableColumnHelper<AdminAffiliate>()
	const columns = [
		colHelper.accessor('name', { header: 'Name', enableSorting: true }),
		colHelper.accessor('email', { header: 'Email', enableSorting: true }),
		colHelper.accessor('status', {
			header: 'Status',
			cell: ({ getValue }) => (
				<Badge size="xsmall" color={STATUS_COLOR[getValue() as string]}>
					{getValue() as string}
				</Badge>
			)
		}),
		colHelper.accessor('created_at', {
			header: 'Created',
			enableSorting: true,
			cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString()
		})
	]

	const filterHelper = createDataTableFilterHelper<AdminAffiliate>()
	const filters = [
		filterHelper.accessor('status', {
			type: 'multiselect',
			label: 'Status',
			options: [
				{ label: 'Active', value: 'active' },
				{ label: 'Restricted', value: 'restricted' },
				{ label: 'Inactive', value: 'inactive' }
			]
		})
	]

	const table = useDataTable({
		columns,
		filters,
		data: data?.affiliates ?? [],
		rowCount: data?.count ?? 0,
		isLoading,
		pagination: { state: pagination, onPaginationChange: setPagination },
		filtering: { state: filtering, onFilteringChange: setFiltering },
		sorting: { state: sorting, onSortingChange: setSorting as any },
		search: { state: search, onSearchChange: setSearch },
		getRowId: row => row.id,
		onRowClick: (_e, row) => navigate(`/affiliates/${row.id}`)
	})

	return (
		<Container className="p-0">
			<DataTable instance={table}>
				<DataTable.Toolbar className="flex items-center justify-between gap-2 px-6 py-4">
					<Heading>Affiliates</Heading>
					<div className="flex items-center gap-2">
						<DataTable.FilterMenu tooltip="Filter" />
						<DataTable.SortingMenu tooltip="Sort" />
						<DataTable.Search placeholder="Search…" />
						<Button size="small" variant="secondary" className="whitespace-nowrap" onClick={() => setCreateOpen(true)}>
							Create
						</Button>
					</div>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
			<CreateAffiliateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={id => navigate(`/affiliates/${id}`)} />
		</Container>
	)
}

export default AffiliatesPage
