import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminUser } from '@medusajs/framework/types'
import { Badge, Container, Heading, Select, Text, toast } from '@medusajs/ui'
import { XMarkMini } from '@medusajs/icons'
import { useAccessRolesList } from '../hooks/roles'
import { useUserAccessRoles, useAssignUserRoles, useRemoveUserRole } from '../hooks/users'

/**
 * View and manage the access roles assigned to a specific user, directly on the
 * user detail page. Assigning from here mirrors the role detail "Add users"
 * flow. If the access API isn't reachable the queries simply return nothing.
 */
const UserAccessRolesWidget = ({ data: user }: DetailWidgetProps<AdminUser>) => {
	const { data: assignedData } = useUserAccessRoles(user.id)
	const { data: allRolesData } = useAccessRolesList({ limit: 200, offset: 0 })
	const assign = useAssignUserRoles(user.id)
	const remove = useRemoveUserRole(user.id)

	const assignedRoles = assignedData?.roles ?? []
	const assignedIds = new Set(assignedRoles.map(r => r.id))
	const available = (allRolesData?.roles ?? []).filter(r => !assignedIds.has(r.id))

	const handleAssign = (roleId: string) => {
		assign.mutate([roleId], {
			onSuccess: () => toast.success('Role assigned'),
			onError: () => toast.error('Failed to assign role')
		})
	}

	const handleRemove = (roleId: string) => {
		remove.mutate(roleId, {
			onSuccess: () => toast.success('Role removed'),
			onError: () => toast.error('Failed to remove role')
		})
	}

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Access Roles</Heading>
			</div>
			<div className="flex flex-col gap-y-4 px-6 py-4">
				{assignedRoles.length ? (
					<div className="flex flex-wrap gap-2">
						{assignedRoles.map(r => (
							<Badge
								key={r.id}
								size="small"
								className="flex items-center gap-x-1"
							>
								{r.name}
								<button
									type="button"
									className="transition-fg text-ui-fg-subtle hover:text-ui-fg-base"
									onClick={() => handleRemove(r.id)}
									aria-label={`Remove ${r.name}`}
								>
									<XMarkMini />
								</button>
							</Badge>
						))}
					</div>
				) : (
					<Text size="small" className="text-ui-fg-subtle">
						No roles assigned.
					</Text>
				)}

				<div className="max-w-sm">
					<Select
						value=""
						onValueChange={handleAssign}
						disabled={!available.length || assign.isPending}
					>
						<Select.Trigger>
							<Select.Value placeholder="Add a role..." />
						</Select.Trigger>
						<Select.Content>
							{available.map(r => (
								<Select.Item key={r.id} value={r.id}>
									{r.name}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				</div>
			</div>
		</Container>
	)
}

export const config = defineWidgetConfig({
	zone: 'user.details.after'
})

export default UserAccessRolesWidget
