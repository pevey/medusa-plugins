import * as zod from 'zod'
import { Drawer, Heading, Label, Input, Button, toast, usePrompt } from '@medusajs/ui'
import { useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { AdminComplaintTag } from '../types'
import { useUpdateComplaintTag } from '../hooks/complaint-tags'

const schema = zod.object({
	value: zod.string().min(1, 'Required')
})
type EditComplaintTagFormData = zod.infer<typeof schema>

type EditComplaintTagDrawerProps = {
	complaintTag: AdminComplaintTag | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditComplaintTagDrawer = ({
	complaintTag,
	open,
	setOpen
}: EditComplaintTagDrawerProps) => {
	const updateMutation = useUpdateComplaintTag(complaintTag?.id)
	const prompt = usePrompt()

	const form = useForm<EditComplaintTagFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			value: ''
		}
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
	}, [complaintTag, open, blocker])

	// Reset form when drawer opens
	useEffect(() => {
		if (complaintTag && open) {
			form.reset({
				value: complaintTag.value
			})
		}
	}, [complaintTag, open, form])


	const handleSubmit = form.handleSubmit(data => {
		updateMutation.mutate(data, {
			onSuccess: () => {
				form.reset()
				setOpen(false)
				toast.success('Complaint tag updated successfully')
			},
			onError: () => toast.error('Failed to update complaint tag')
		})
	})

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Complaint Tag</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							{/* Value */}
							<Controller
								control={form.control}
								name="value"
								rules={{ required: 'Value is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Tag Value
										</Label>
										<Input {...field} placeholder="e.g. VIP" />
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
