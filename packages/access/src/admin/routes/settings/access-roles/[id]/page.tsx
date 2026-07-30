import { Badge, Button, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { EditRoleDrawer } from '../../../../components/edit-role-drawer'
import { ManageRolePermissionsDrawer } from '../../../../components/manage-role-permissions-drawer'
import { AddRoleUsersModal } from '../../../../components/add-role-users-modal'
import { useAccessRole, useAccessRolePolicies, useAccessRoleUsers, useDeleteAccessRoles, useRemoveAccessRoleUsers } from '../../../../hooks/roles'

type RoleLoaderData = { role: { id: string; name: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<RoleLoaderData>(`/admin/access/roles/${id}`, {
		query: { fields: 'id,name' }
	})
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<RoleLoaderData>) => data?.role?.name || data?.role?.id || 'Role'
}

const RoleDetailPage = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const prompt = usePrompt()
	const [editOpen, setEditOpen] = useState(false)
	const [permsOpen, setPermsOpen] = useState(false)
	const [usersOpen, setUsersOpen] = useState(false)

	const { data, isLoading } = useAccessRole(id)
	const { data: policiesData } = useAccessRolePolicies(id)
	const { data: usersData } = useAccessRoleUsers(id)
	const { mutate: deleteRoles } = useDeleteAccessRoles()
	const { mutate: removeUsers } = useRemoveAccessRoleUsers(id)

	const role = data?.role
	const policies = policiesData?.policies ?? []
	const users = usersData?.users ?? []

	const handleDelete = async () => {
		const confirmed = await prompt({
			title: 'Delete role?',
			description: 'This action cannot be undone.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (!confirmed) return
		deleteRoles([role!.id], {
			onSuccess: () => {
				toast.success('Role deleted successfully')
				navigate('/settings/access-roles')
			},
			onError: () => toast.error('Failed to delete role')
		})
	}

	const handleRemoveUser = async (userId: string, email: string) => {
		const confirmed = await prompt({
			title: 'Remove user from role?',
			description: `Remove ${email} from this role?`,
			confirmText: 'Remove',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (!confirmed) return
		removeUsers([userId], {
			onSuccess: () => toast.success('User removed from role'),
			onError: () => toast.error('Failed to remove user')
		})
	}

	if (isLoading) {
		return (
			<Container className="p-6">
				<Text>Loading...</Text>
			</Container>
		)
	}
	if (!role) {
		return (
			<Container className="p-6">
				<Text>Role not found.</Text>
			</Container>
		)
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			{/* General */}
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">{role.name}</Heading>
					<ActionMenu
						groups={[
							{
								actions: [
									{
										label: 'Edit',
										icon: <PencilSquare />,
										onClick: () => setEditOpen(true)
									},
									{ label: 'Delete', icon: <Trash />, onClick: handleDelete }
								]
							}
						]}
					/>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Description
					</Text>
					<Text size="small" leading="compact">
						{role.description || '-'}
					</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Created At
					</Text>
					<Text size="small" leading="compact">
						{new Date(role.created_at).toLocaleString('en-US', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})}
					</Text>
				</div>
			</Container>

			{/* Permissions */}
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Permissions</Heading>
					<Button size="small" variant="secondary" onClick={() => setPermsOpen(true)}>
						Manage
					</Button>
				</div>
				<div className="px-6 py-4">
					{policies.length ? (
						<div className="flex flex-wrap gap-2">
							{policies.map(p => (
								<Badge key={p.id} size="xsmall">
									{p.policy}
								</Badge>
							))}
						</div>
					) : (
						<Text size="small" className="text-ui-fg-subtle">
							No permissions assigned.
						</Text>
					)}
				</div>
			</Container>

			{/* Users */}
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Users</Heading>
					<Button size="small" variant="secondary" onClick={() => setUsersOpen(true)}>
						Add
					</Button>
				</div>
				{users.length ? (
					users.map(u => (
						<div key={u.id} className="flex items-center justify-between px-6 py-4">
							<div className="flex flex-col">
								<Text size="small" weight="plus" leading="compact">
									{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
								</Text>
								<Text size="small" className="text-ui-fg-subtle" leading="compact">
									{u.email}
								</Text>
							</div>
							<Button size="small" variant="transparent" onClick={() => handleRemoveUser(u.id, u.email)}>
								Remove
							</Button>
						</div>
					))
				) : (
					<div className="px-6 py-4">
						<Text size="small" className="text-ui-fg-subtle">
							No users assigned.
						</Text>
					</div>
				)}
			</Container>

			<EditRoleDrawer role={role} open={editOpen} setOpen={setEditOpen} />
			<ManageRolePermissionsDrawer roleId={id} open={permsOpen} setOpen={setPermsOpen} />
			<AddRoleUsersModal roleId={id} open={usersOpen} setOpen={setUsersOpen} />
		</div>
	)
}

export default RoleDetailPage
