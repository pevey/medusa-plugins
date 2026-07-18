import { useMemo, useState } from 'react'
import {
	FocusModal,
	Heading,
	Text,
	Button,
	createDataTableColumnHelper,
	DataTable,
	DataTablePaginationState,
	DataTableRowSelectionState,
	useDataTable,
	toast
} from '@medusajs/ui'
import { useUsersList } from '../hooks/users'
import { useAccessRoleUsers, useAssignAccessRoleUsers } from '../hooks/roles'
import { AdminUserRow } from '../types'

type AddRoleUsersModalProps = {
	roleId: string | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

const columnHelper = createDataTableColumnHelper<AdminUserRow>()

const columns = [
	columnHelper.select(),
	columnHelper.accessor('email', { header: 'Email' }),
	columnHelper.accessor('first_name', {
		header: 'First Name',
		cell: info => info.getValue() ?? '-'
	}),
	columnHelper.accessor('last_name', {
		header: 'Last Name',
		cell: info => info.getValue() ?? '-'
	})
]

export const AddRoleUsersModal = ({ roleId, open, setOpen }: AddRoleUsersModalProps) => {
	const limit = 10
	const [pagination, setPagination] = useState<DataTablePaginationState>({
		pageSize: limit,
		pageIndex: 0
	})
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])
	const [search, setSearch] = useState('')
	const [selection, setSelection] = useState<DataTableRowSelectionState>({})

	const { data, isLoading } = useUsersList({ limit, offset, q: search })
	const { data: roleUsers } = useAccessRoleUsers(open ? roleId : undefined)
	const assignUsers = useAssignAccessRoleUsers(roleId)

	const alreadyAssigned = useMemo(
		() => new Set((roleUsers?.users || []).map(u => u.id)),
		[roleUsers]
	)

	const table = useDataTable({
		columns,
		data: data?.users || [],
		getRowId: row => row.id,
		rowCount: data?.count || 0,
		isLoading,
		rowSelection: { state: selection, onRowSelectionChange: setSelection },
		pagination: { state: pagination, onPaginationChange: setPagination },
		search: { state: search, onSearchChange: setSearch }
	})

	const handleSave = () => {
		// Only assign users not already in the role.
		const users = Object.keys(selection).filter(id => selection[id] && !alreadyAssigned.has(id))
		if (!users.length) {
			setOpen(false)
			return
		}
		assignUsers.mutate(users, {
			onSuccess: () => {
				toast.success('Users added to role')
				setSelection({})
				setOpen(false)
			},
			onError: () => toast.error('Failed to add users')
		})
	}

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<FocusModal.Header></FocusModal.Header>
				<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
					<div className="mx-auto flex w-full max-w-[900px] flex-col gap-y-4 px-2 py-16">
						<div>
							<Heading>Add Users to Role</Heading>
							<Text size="small" className="text-ui-fg-subtle">
								Users already assigned to this role are skipped.
							</Text>
						</div>
						<DataTable instance={table}>
							<DataTable.Toolbar className="flex justify-end">
								<DataTable.Search placeholder="Search users..." />
							</DataTable.Toolbar>
							<DataTable.Table />
							<DataTable.Pagination />
						</DataTable>
					</div>
				</FocusModal.Body>
				<FocusModal.Footer className="flex w-full items-center justify-end gap-x-2">
					<Button
						type="button"
						size="small"
						variant="secondary"
						onClick={() => setOpen(false)}
						disabled={assignUsers.isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="small"
						onClick={handleSave}
						isLoading={assignUsers.isPending}
					>
						Save
					</Button>
				</FocusModal.Footer>
			</FocusModal.Content>
		</FocusModal>
	)
}
