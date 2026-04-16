import * as zod from 'zod'
import { FocusModal, Heading, Text, Button, Input, toast, usePrompt } from '@medusajs/ui'
import { useEffect } from 'react'
import { FormProvider, Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { useCreateInvalidationReason } from '../hooks/invalidation-reasons'

const schema = zod.object({
	value: zod.string().min(1, 'Required')
})
type CreateInvalidationReasonFormData = zod.infer<typeof schema>

type CreateInvalidationReasonDrawerProps = {
	open: boolean
	setOpen: (open: boolean) => void
}

export const CreateInvalidationReasonModal = ({
	open,
	setOpen
}: CreateInvalidationReasonDrawerProps) => {
	const { mutate: createReason, isPending } = useCreateInvalidationReason()
	const prompt = usePrompt()

	const form = useForm<CreateInvalidationReasonFormData>({
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
			console.log('useEffect triggered with blocker state:', blocker.state)
			handleNavigate()
		}
	}, [form.formState.isDirty, open, blocker])

	const handleSubmit = form.handleSubmit(data => {
		createReason(data, {
			onSuccess: () => {
				toast.success('Invalidation reason created successfully')
				form.reset()
				setOpen(false)
			},
			onError: () => toast.error('Failed to create invalidation reason')
		})
	})

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex h-full flex-col">
						<FocusModal.Header></FocusModal.Header>
						<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
							<div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
								<div>
									<Heading className="capitalize">Create Invalidation Reason</Heading>
								</div>
								<div className="grid grid-cols-1 gap-4">
									{/* Value */}
									<Controller
										control={form.control}
										name="value"
										render={({ field }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Reason
												</Text>
												<Input {...field} placeholder="e.g. VIP" />
											</div>
										)}
									/>
								</div>
							</div>
						</FocusModal.Body>
						<FocusModal.Footer className="flex w-full items-center justify-end gap-x-2">
							<Button
								type="button"
								size="small"
								variant="secondary"
								onClick={() => setOpen(false)}
								disabled={isPending}
							>
								Cancel
							</Button>
							<Button type="submit" size="small" isLoading={isPending} disabled={isPending}>
								Save
							</Button>
						</FocusModal.Footer>
					</form>
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
