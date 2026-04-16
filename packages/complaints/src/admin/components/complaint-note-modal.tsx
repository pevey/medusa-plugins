import * as zod from 'zod'
import { FocusModal, Heading, Text, Textarea, Button, Input, toast, usePrompt } from '@medusajs/ui'
import { useEffect } from 'react'
import { FormProvider, Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { AdminComplaintActivity } from '../types'
import { useCreateNote, useUpdateNote } from '../hooks/complaints'

const schema = zod.object({
	note: zod.string().min(1, 'Required')
})
type ComplaintNoteFormData = zod.infer<typeof schema>

type ComplaintNoteDrawerProps = {
	complaintId: string
	note?: AdminComplaintActivity
	open: boolean
	setOpen: (open: boolean) => void
}

export const ComplaintNoteModal = ({
	open,
	setOpen,
	complaintId,
	note
}: ComplaintNoteDrawerProps) => {
	const { mutate: createNote, isPending } = useCreateNote(complaintId)
	const { mutate: updateNote } = useUpdateNote(complaintId, note?.id)
	const prompt = usePrompt()

	const form = useForm<ComplaintNoteFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			note: note?.note || ''
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
			console.log('useEffect triggered with blocker state:', blocker.state)
			handleNavigate()
		}
	}, [form.formState.isDirty, open, blocker])

	const handleSubmit = form.handleSubmit(data => {
		const onSuccess = () => {
			toast.success(note?.id ? 'Note updated successfully' : 'Note created successfully')
			form.reset()
			setOpen(false)
		}
		const onError = () =>
			toast.error(
				note?.id ? 'Failed to update complaint note' : 'Failed to create complaint note'
			)
		if (note?.id) {
			updateNote(data, { onSuccess, onError })
		} else {
			createNote(data, { onSuccess, onError })
		}
	})

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex h-full flex-col overflow-hidden">
						<FocusModal.Header>
							<div className="flex items-center justify-end gap-x-2">
								<FocusModal.Close asChild>
									<Button size="small" variant="secondary">
										Cancel
									</Button>
								</FocusModal.Close>
								<Button type="submit" size="small" isLoading={isPending}>
									Save
								</Button>
							</div>
						</FocusModal.Header>
						<FocusModal.Body>
							<div className="flex flex-1 flex-col items-center overflow-y-auto">
								<div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
									<div>
										<Heading className="capitalize">Add Complaint Note</Heading>
									</div>
									<div className="grid grid-cols-1 gap-4">
										<Controller
											control={form.control}
											name="note"
											render={({ field }) => (
												<div className="flex flex-col space-y-2">
													<Text size="small" weight="plus">
														Note
													</Text>
													<Textarea {...field} />
												</div>
											)}
										/>
									</div>
								</div>
							</div>
						</FocusModal.Body>
					</form>
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
