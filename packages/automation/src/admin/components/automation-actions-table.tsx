import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAutomationActions, useDeleteAutomationActions } from '../hooks/automations'
import {
	Badge,
	Button,
	Container,
	createDataTableColumnHelper,
	createDataTableCommandHelper,
	DataTable,
	DataTablePaginationState,
	DataTableRowSelectionState,
	Heading,
	useDataTable,
	usePrompt
} from '@medusajs/ui'
import { Plus } from '@medusajs/icons'
import { CreateAutomationActionModal } from './create-automation-action-modal'
import { ActionType, AutomationAction } from '../types'

const ACTION_COLORS: Record<ActionType, 'orange' | 'green'> = {
	outgoing_webhook: 'orange',
	outgoing_request: 'orange',
	medusa_workflow: 'green'
}

const ACTION_LABELS: Record<ActionType, string> = {
	outgoing_webhook: 'Outgoing Webhook',
	outgoing_request: 'Outgoing Request',
	medusa_workflow: 'Medusa Workflow'
}

type Props = {
	triggerId: string
	triggerType: 'medusa_event' | 'incoming_webhook'
	triggerEvents?: string[]
}

const columnHelper = createDataTableColumnHelper<AutomationAction>()

export const AutomationActionsTable = ({ triggerId, triggerType, triggerEvents = [] }: Props) => {
	const limit = 10
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
	const [createOpen, setCreateOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useAutomationActions(triggerId, { limit, offset })
	const { mutateAsync: deleteActions } = useDeleteAutomationActions(triggerId)

	const columns = [
		columnHelper.accessor('name', { header: 'Name' }),
		columnHelper.accessor('action_type', {
			header: 'Type',
			cell: ({ getValue }) => {
				const val = getValue()
				return (
					<Badge size="xsmall" color={ACTION_COLORS[val]}>
						{ACTION_LABELS[val]}
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
				row.action_type === 'outgoing_webhook'
					? (row.target_url ?? '—')
					: (row.medusa_workflow ?? '—'),
			{
				id: 'destination',
				header: 'Destination',
				cell: ({ getValue }) => {
					const val = getValue() as string
					return val.length > 45 ? `${val.slice(0, 45)}…` : val
				}
			}
		)
	]

	const commandHelper = createDataTableCommandHelper()
	const useCommands = () => [
		commandHelper.command({
			label: 'Delete',
			shortcut: 'X',
			action: async selection => {
				const ids = Object.keys(selection)
				const confirmed = await prompt({
					title: `Delete ${ids.length} action${ids.length > 1 ? 's' : ''}?`,
					description: 'This will also delete all associated deliveries.',
					confirmText: 'Delete',
					cancelText: 'Cancel',
					variant: 'danger'
				})
				if (!confirmed) return
				await deleteActions(ids)
			}
		})
	]
	const commands = useCommands()

	const table = useDataTable({
		columns,
		data: data?.actions || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		commands,
		rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
		onRowClick: (_, row) => navigate(`actions/${row.id}`),
		pagination: { state: pagination, onPaginationChange: setPagination }
	})

	return (
		<>
			<Container className="divide-y p-0">
				<DataTable instance={table}>
					<DataTable.Toolbar className="flex items-center justify-between px-6 py-4">
						<Heading level="h2">Actions</Heading>
						<Button size="small" onClick={() => setCreateOpen(true)}>
							<Plus /> Add Action
						</Button>
					</DataTable.Toolbar>
					<DataTable.Table />
					<DataTable.CommandBar selectedLabel={count => `${count} selected`} />
					<DataTable.Pagination />
				</DataTable>
			</Container>

			<CreateAutomationActionModal
				triggerId={triggerId}
				triggerType={triggerType}
				triggerEvents={triggerEvents}
				open={createOpen}
				setOpen={setCreateOpen}
			/>
		</>
	)
}
