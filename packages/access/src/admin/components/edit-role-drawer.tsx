import * as zod from 'zod'
import { Drawer, Heading, Label, Input, Textarea, Button, toast, usePrompt } from '@medusajs/ui'
import { useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { AdminAccessRole } from '../types'
import { useUpdateAccessRole } from '../hooks/roles'

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	description: zod.string().optional()
})
type EditRoleFormData = zod.infer<typeof schema>

type EditRoleDrawerProps = {
	role: AdminAccessRole | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditRoleDrawer = ({ role, open, setOpen }: EditRoleDrawerProps) => {
	const updateMutation = useUpdateAccessRole(role?.id)
	const prompt = usePrompt()

	const form = useForm<EditRoleFormData>({
		resolver: zodResolver(schema),
		defaultValues: { name: '', description: '' }
	})

	let blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			form.formState.isDirty && currentLocation.pathname !== nextLocation.pathname
	)

	const handleNavigate = async () => {
		if (blocker.state !== 'blocked') return
		const confirmed = await prompt({
			title: 'Are you sure you want to leave this form?',
			description: 'You have unsaved changes that will be lost if you exit this form.',
			confirmText: 'Continue',
			cancelText: 'Cancel',
			variant: 'confirmation'
		})
		if (confirmed) {
			blocker.proceed()
		} else {
			blocker.reset()
		}
	}

	useEffect(() => {
		if (blocker.state === 'blocked') {
			handleNavigate()
		}
	}, [role, open, blocker])

	// Reset form when drawer opens
	useEffect(() => {
		if (role && open) {
			form.reset({ name: role.name, description: role.description ?? '' })
		}
	}, [role, open, form])

	const handleSubmit = form.handleSubmit(data => {
		updateMutation.mutate(
			{ name: data.name, description: data.description || undefined },
			{
				onSuccess: () => {
					form.reset()
					setOpen(false)
					toast.success('Role updated successfully')
				},
				onError: () => toast.error('Failed to update role')
			}
		)
	})

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Role</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							<Controller
								control={form.control}
								name="name"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Name
										</Label>
										<Input {...field} placeholder="e.g. Support Agent" />
									</div>
								)}
							/>
							<Controller
								control={form.control}
								name="description"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Description
										</Label>
										<Textarea {...field} placeholder="What can this role do?" />
									</div>
								)}
							/>
						</Drawer.Body>
						<Drawer.Footer>
							<div className="flex items-center justify-end gap-x-2">
								<Drawer.Close asChild>
									<Button size="small" variant="secondary">
										Cancel
									</Button>
								</Drawer.Close>
								<Button
									size="small"
									type="submit"
									disabled={!form.formState.isDirty}
									isLoading={updateMutation.isPending}
								>
									Save
								</Button>
							</div>
						</Drawer.Footer>
					</form>
				</FormProvider>
			</Drawer.Content>
		</Drawer>
	)
}
