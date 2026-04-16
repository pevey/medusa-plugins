import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Star } from '@medusajs/icons'
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
	Text,
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { AdminReview, ReviewStatus } from '../../types'
import {
	useReviewsList,
	useApproveReviews,
	useRejectReviews,
	useDeleteReviews
} from '../../hooks/reviews'

export const config = defineRouteConfig({ label: 'Reviews', icon: Star, rank: 10 })
export const handle = { breadcrumb: () => 'Reviews' }

const STATUS_COLORS: Record<ReviewStatus, 'blue' | 'green' | 'red'> = {
	pending: 'blue',
	approved: 'green',
	rejected: 'red'
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
	pending: 'Pending',
	approved: 'Approved',
	rejected: 'Rejected'
}

const ReviewsPage = () => {
	const limit = 20
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	// Default to 'new' so the list opens filtered to new reviews
	const [filtering, setFiltering] = useState<DataTableFilteringState>({ status: 'pending' })
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')
	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})

	const { data, isLoading } = useReviewsList({
		limit,
		offset,
		q: search || undefined,
		...(filtering.status !== undefined ? { status: filtering.status } : {}),
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : '-created_at'
	})

	const { mutateAsync: approveReviews } = useApproveReviews()
	const { mutateAsync: rejectReviews } = useRejectReviews()
	const { mutateAsync: deleteReviews } = useDeleteReviews()

	const columnHelper = createDataTableColumnHelper<AdminReview>()
	const columns = [
		columnHelper.select(),
		columnHelper.accessor('status', {
			header: 'Status',
			cell: ({ getValue }) => {
				const s = getValue() as ReviewStatus
				return (
					<Badge size="xsmall" color={STATUS_COLORS[s]}>
						{STATUS_LABELS[s]}
					</Badge>
				)
			}
		}),
		columnHelper.accessor('rating', {
			header: 'Rating',
			cell: ({ getValue }) => `${getValue()} / 5`
		}),
		columnHelper.accessor('author_name', {
			header: 'Author',
			enableSorting: true,
			sortLabel: 'Author',
			sortAscLabel: 'A–Z',
			sortDescLabel: 'Z–A'
		}),
		columnHelper.accessor('title', {
			header: 'Title',
			cell: ({ getValue }) => {
				const v = getValue()
				return v ? (
					<Text size="small" className="truncate max-w-[220px]">
						{v}
					</Text>
				) : (
					<Text size="small" className="text-ui-fg-muted">
						—
					</Text>
				)
			}
		}),
		columnHelper.accessor('body', {
			header: 'Preview',
			cell: ({ getValue }) => {
				const v = getValue() as string
				return (
					<Text size="small" className="text-ui-fg-subtle truncate max-w-[280px]">
						{v.length > 60 ? `${v.slice(0, 60)}…` : v}
					</Text>
				)
			}
		}),
		columnHelper.accessor('created_at', {
			header: 'Received',
			enableSorting: true,
			sortLabel: 'Received',
			sortAscLabel: 'Oldest first',
			sortDescLabel: 'Newest first',
			cell: ({ getValue }) => (
				<Text size="small" className="text-ui-fg-subtle">
					{new Date(getValue()).toLocaleDateString()}
				</Text>
			)
		})
	]

	const commandHelper = createDataTableCommandHelper()
	const prompt = usePrompt()
	const useCommands = () => [
		commandHelper.command({
			label: 'Approve',
			shortcut: 'A',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Approve ${ids.length} review${ids.length > 1 ? 's' : ''}?`,
					description: 'Approved reviews will be visible to customers.',
					confirmText: 'Approve',
					cancelText: 'Cancel',
					variant: 'confirmation'
				})
				if (!confirmed) return
				await approveReviews(ids)
				setRowSelection({})
			}
		}),
		commandHelper.command({
			label: 'Reject',
			shortcut: 'R',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Reject ${ids.length} review${ids.length > 1 ? 's' : ''}?`,
					description: 'Rejected reviews will not be shown to customers.',
					confirmText: 'Reject',
					cancelText: 'Cancel',
					variant: 'confirmation'
				})
				if (!confirmed) return
				await rejectReviews(ids)
				setRowSelection({})
			}
		}),
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} review${ids.length > 1 ? 's' : ''}?`,
					description: 'This cannot be undone.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteReviews(ids)
				setRowSelection({})
			}
		})
	]
	const commands = useCommands()

	const filterHelper = createDataTableFilterHelper<AdminReview>()
	const filters = [
		filterHelper.accessor('status', {
			type: 'select',
			label: 'Status',
			options: [
				{ label: 'Pending', value: 'pending' },
				{ label: 'Approved', value: 'approved' },
				{ label: 'Rejected', value: 'rejected' }
			]
		})
	]

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.reviews || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		commands,
		filters,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: (_, row) => navigate(`${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination },
		filtering: { state: filtering, onFilteringChange: setFiltering },
		sorting: { state: sorting, onSortingChange: setSorting },
		search: { state: search, onSearchChange: setSearch }
	})

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
						<Heading>Reviews</Heading>
						<div className="flex gap-2">
							<DataTable.Search placeholder="Search by author…" />
							<DataTable.FilterMenu tooltip="Filter" />
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

export default ReviewsPage
