import * as zod from 'zod'
import { FocusModal, ProgressTabs, Heading, Text, Button, Input, Textarea, DataTableRowSelectionState, toast, usePrompt } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { FormProvider, Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { useCreateAccessRole } from '../hooks/roles'
import { PolicyPicker } from './policy-picker'

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	description: zod.string().optional()
})
type CreateRoleFormData = zod.infer<typeof schema>

type CreateRoleModalProps = {
	open: boolean
	setOpen: (open: boolean) => void
}

type Tab = 'details' | 'permissions'

export const CreateRoleModal = ({ open, setOpen }: CreateRoleModalProps) => {
	const { mutate: createRole, isPending } = useCreateAccessRole()
	const prompt = usePrompt()
	const [tab, setTab] = useState<Tab>('details')
	const [selection, setSelection] = useState<DataTableRowSelectionState>({})

	const form = useForm<CreateRoleFormData>({
		resolver: zodResolver(schema),
		defaultValues: { name: '', description: '' }
	})

	// Reset wizard state whenever it is (re)opened.
	useEffect(() => {
		if (open) {
			setTab('details')
			setSelection({})
			form.reset({ name: '', description: '' })
		}
	}, [open])

	let blocker = useBlocker(({ currentLocation, nextLocation }) => form.formState.isDirty && currentLocation.pathname !== nextLocation.pathname)

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
	}, [form.formState.isDirty, open, blocker])

	const handleContinue = async () => {
		const ok = await form.trigger('name')
		if (ok) {
			setTab('permissions')
		}
	}

	const handleCreate = (data: CreateRoleFormData) => {
		// If Enter is pressed on the details tab, advance instead of submitting.
		if (tab !== 'permissions') {
			handleContinue()
			return
		}
		const policy_ids = Object.keys(selection).filter(id => selection[id])
		createRole(
			{
				name: data.name,
				description: data.description || undefined,
				policy_ids: policy_ids.length ? policy_ids : undefined
			},
			{
				onSuccess: () => {
					toast.success('Role created successfully')
					setOpen(false)
				},
				onError: () => toast.error('Failed to create role')
			}
		)
	}

	const handleSubmit = form.handleSubmit(handleCreate)
	const nameFilled = !!form.watch('name')

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex h-full flex-col">
						<ProgressTabs value={tab} onValueChange={value => setTab(value as Tab)}>
							<FocusModal.Header>
								<FocusModal.Title className="sr-only">Create Role</FocusModal.Title>
								<FocusModal.Description className="sr-only">
									Create a new role: name it, describe it, and assign its permissions.
								</FocusModal.Description>
								<ProgressTabs.List>
									<ProgressTabs.Trigger value="details" status={tab === 'details' ? 'in-progress' : nameFilled ? 'completed' : 'not-started'}>
										Details
									</ProgressTabs.Trigger>
									<ProgressTabs.Trigger value="permissions" status={tab === 'permissions' ? 'in-progress' : 'not-started'}>
										Permissions
									</ProgressTabs.Trigger>
								</ProgressTabs.List>
							</FocusModal.Header>
							<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
								<ProgressTabs.Content value="details" className="w-full">
									<div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
										<div>
											<Heading>Create Role</Heading>
										</div>
										<div className="grid grid-cols-1 gap-4">
											<Controller
												control={form.control}
												name="name"
												render={({ field }) => (
													<div className="flex flex-col space-y-2">
														<Text size="small" weight="plus">
															Name
														</Text>
														<Input {...field} placeholder="e.g. Support Agent" />
													</div>
												)}
											/>
											<Controller
												control={form.control}
												name="description"
												render={({ field }) => (
													<div className="flex flex-col space-y-2">
														<Text size="small" weight="plus">
															Description
														</Text>
														<Textarea {...field} placeholder="What can this role do?" />
													</div>
												)}
											/>
										</div>
									</div>
								</ProgressTabs.Content>
								<ProgressTabs.Content value="permissions" className="w-full">
									<div className="mx-auto flex w-full max-w-[900px] flex-col gap-y-4 px-2 py-16">
										<div>
											<Heading>Assign Permissions</Heading>
											<Text size="small" className="text-ui-fg-subtle">
												Select the policies this role should grant. You can change these later.
											</Text>
										</div>
										<PolicyPicker selection={selection} onSelectionChange={setSelection} />
									</div>
								</ProgressTabs.Content>
							</FocusModal.Body>
							<FocusModal.Footer className="flex w-full items-center justify-end gap-x-2">
								<Button type="button" size="small" variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
									Cancel
								</Button>
								{tab === 'details' ? (
									<Button type="button" size="small" onClick={handleContinue}>
										Continue
									</Button>
								) : (
									<>
										<Button type="button" size="small" variant="secondary" onClick={() => setTab('details')} disabled={isPending}>
											Back
										</Button>
										<Button type="submit" size="small" isLoading={isPending} disabled={isPending}>
											Save
										</Button>
									</>
								)}
							</FocusModal.Footer>
						</ProgressTabs>
					</form>
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
