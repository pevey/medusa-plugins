import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ArrowUpRightOnBox, Key } from '@medusajs/icons'
import {
	Badge,
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
import { CreateWebhookTriggerModal } from '../../../components/create-webhook-trigger-modal'
import { ManageWebhookSecretsModal } from '../../../components/manage-webhook-secrets-modal'
import { TriggerType, WebhookTrigger } from '../../../types'
import { useWebhookTriggersList, useDeleteWebhookTriggers } from '../../../hooks/webhooks'

export const config = defineRouteConfig({ label: 'Webhooks', icon: ArrowUpRightOnBox, rank: 50 })
export const handle = { breadcrumb: () => 'Triggers' }

const TRIGGER_COLORS: Record<TriggerType, 'blue' | 'purple'> = {
	medusa_event: 'blue',
	incoming_webhook: 'purple'
}
const TRIGGER_LABELS: Record<TriggerType, string> = {
	medusa_event: 'Medusa Event',
	incoming_webhook: 'Incoming Webhook'
}

const WebhooksPage = () => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [filtering, setFiltering] = useState<DataTableFilteringState>({})
	const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
	const [search, setSearch] = useState('')
	const [createOpen, setCreateOpen] = useState(false)
	const [secretsOpen, setSecretsOpen] = useState(false)

	const { data, isLoading } = useWebhookTriggersList({
		limit,
		offset,
		q: search || undefined,
		...(filtering.trigger_type !== undefined ? { trigger_type: filtering.trigger_type } : {}),
		...(filtering.is_active !== undefined ? { is_active: filtering.is_active } : {}),
		order: sorting ? `${sorting.desc ? '-' : ''}${sorting.id}` : undefined
	})
	const { mutateAsync: deleteTriggers } = useDeleteWebhookTriggers()

	const columnHelper = createDataTableColumnHelper<WebhookTrigger>()
	const columns = [
		columnHelper.accessor('name', {
			header: 'Name',
			enableSorting: true,
			sortLabel: 'Name',
			sortAscLabel: 'A–Z',
			sortDescLabel: 'Z–A'
		}),
		columnHelper.accessor('trigger_type', {
			header: 'Type',
			cell: ({ getValue }) => {
				const val = getValue()
				return (
					<Badge size="xsmall" color={TRIGGER_COLORS[val]}>
						{TRIGGER_LABELS[val]}
					</Badge>
				)
			}
		}),
		columnHelper.accessor('is_active', {
			header: 'Status',
			cell: ({ getValue }) => (
				<Badge size="xsmall" color={getValue() ? 'green' : 'grey'}>
					{getValue() ? 'Active' : 'Inactive'}
				</Badge>
			)
		}),
		columnHelper.accessor(
			row =>
				row.trigger_type === 'medusa_event'
					? (row.trigger_events ?? []).join(', ') || '—'
					: 'POST /webhooks/' + row.id,
			{
				id: 'details',
				header: 'Details',
				cell: ({ getValue }) => {
					const val = getValue() as string
					return val.length > 55 ? `${val.slice(0, 55)}…` : val
				}
			}
		)
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
					title: `Delete ${ids.length} trigger${ids.length > 1 ? 's' : ''}?`,
					description: 'This will also delete all associated actions and deliveries.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteTriggers(ids)
			}
		})
	]
	const commands = useCommands()

	const filterHelper = createDataTableFilterHelper<WebhookTrigger>()
	const filters = [
		filterHelper.accessor('trigger_type', {
			type: 'select',
			label: 'Type',
			options: [
				{ label: 'Medusa Event', value: 'medusa_event' },
				{ label: 'Incoming Webhook', value: 'incoming_webhook' }
			]
		}),
		filterHelper.accessor('is_active', {
			type: 'select',
			label: 'Status',
			options: [
				{ label: 'Active', value: 'true' },
				{ label: 'Inactive', value: 'false' }
			]
		})
	]

	const navigate = useNavigate()

	const table = useDataTable({
		columns,
		data: data?.triggers || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: (_, row) => navigate(`${row.id}`),
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
						<Heading>Triggers</Heading>
						<div className="flex gap-2">
							<Button size="small" variant="secondary" onClick={() => setSecretsOpen(true)}>
								{' '}
								<Key /> Signing Secrets
							</Button>
							<DataTable.Search placeholder="Search..." />
							<DataTable.FilterMenu tooltip="Filter" />
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
			<CreateWebhookTriggerModal open={createOpen} setOpen={setCreateOpen} />
			<ManageWebhookSecretsModal open={secretsOpen} setOpen={setSecretsOpen} />
		</div>
	)
}

export default WebhooksPage
