import { Drawer, Heading, Text, Button, DataTableRowSelectionState, toast } from '@medusajs/ui'
import { useEffect, useMemo, useState } from 'react'
import {
	useAccessRolePolicies,
	useAddAccessRolePolicies,
	useRemoveAccessRolePolicy
} from '../hooks/roles'
import { PolicyPicker } from './policy-picker'

type ManageRolePermissionsDrawerProps = {
	roleId: string | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

/**
 * Seeds a policy picker from the role's current policies, then on save diffs the
 * selection: newly-checked policies are attached, unchecked ones are detached.
 */
export const ManageRolePermissionsDrawer = ({
	roleId,
	open,
	setOpen
}: ManageRolePermissionsDrawerProps) => {
	const { data: rolePolicies } = useAccessRolePolicies(open ? roleId : undefined)
	const addPolicies = useAddAccessRolePolicies(roleId)
	const removePolicy = useRemoveAccessRolePolicy(roleId)
	const [selection, setSelection] = useState<DataTableRowSelectionState>({})
	const [isSaving, setIsSaving] = useState(false)

	const initialIds = useMemo(
		() => new Set((rolePolicies?.policies || []).map(p => p.policy_id)),
		[rolePolicies]
	)

	// Seed the selection from the role's current policies when the drawer opens.
	useEffect(() => {
		if (open && rolePolicies) {
			const seeded: DataTableRowSelectionState = {}
			for (const p of rolePolicies.policies) {
				seeded[p.policy_id] = true
			}
			setSelection(seeded)
		}
	}, [open, rolePolicies])

	const handleSave = async () => {
		const selectedIds = Object.keys(selection).filter(id => selection[id])
		const selectedSet = new Set(selectedIds)
		const toAdd = selectedIds.filter(id => !initialIds.has(id))
		const toRemove = [...initialIds].filter(id => !selectedSet.has(id))

		if (!toAdd.length && !toRemove.length) {
			setOpen(false)
			return
		}

		setIsSaving(true)
		try {
			if (toAdd.length) {
				await addPolicies.mutateAsync(toAdd)
			}
			for (const id of toRemove) {
				await removePolicy.mutateAsync(id)
			}
			toast.success('Permissions updated successfully')
			setOpen(false)
		} catch {
			toast.error('Failed to update permissions')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content className="max-w-[720px]">
				<Drawer.Header>
					<Heading level="h1">Manage Permissions</Heading>
				</Drawer.Header>
				<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-4 overflow-y-auto">
					<Text size="small" className="text-ui-fg-subtle">
						Check the policies this role should grant.
					</Text>
					<PolicyPicker selection={selection} onSelectionChange={setSelection} />
				</Drawer.Body>
				<Drawer.Footer>
					<div className="flex items-center justify-end gap-x-2">
						<Drawer.Close asChild>
							<Button size="small" variant="secondary" disabled={isSaving}>
								Cancel
							</Button>
						</Drawer.Close>
						<Button size="small" onClick={handleSave} isLoading={isSaving}>
							Save
						</Button>
					</div>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer>
	)
}
