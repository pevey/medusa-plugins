import * as zod from 'zod'
import { FocusModal, Heading, Input, Button, Switch, Textarea, Text, toast, usePrompt } from '@medusajs/ui'
import { useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { useCreateRubric } from '../hooks/analytics'

const schema = zod.object({
	name: zod
		.string()
		.min(1, 'Required')
		.regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case'),
	label: zod.string().min(1, 'Required'),
	description: zod.string().nullable().optional(),
	active: zod.boolean()
})
type CreateRubricFormData = zod.infer<typeof schema>

type CreateRubricModalProps = {
	open: boolean
	setOpen: (open: boolean) => void
}

export const CreateRubricModal = ({ open, setOpen }: CreateRubricModalProps) => {
	const createRubric = useCreateRubric()
	const prompt = usePrompt()

	const form = useForm<CreateRubricFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '',
			label: '',
			description: null,
			active: true
		}
	})

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
	}, [open, blocker])

	useEffect(() => {
		if (open) {
			form.reset({
				name: '',
				label: '',
				description: null,
				active: true
			})
		}
	}, [open, form])

	const handleSubmit = form.handleSubmit(data => {
		createRubric.mutate(data, {
			onSuccess: () => {
				form.reset()
				setOpen(false)
				toast.success('Event rubric created')
			},
			onError: (error: any) => toast.error(error.message || 'Failed to create rubric')
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
									<FocusModal.Title asChild>
										<Heading className="capitalize">Create Event Rubric</Heading>
									</FocusModal.Title>
									<FocusModal.Description className="sr-only">Create a new event rubric: name it, label it, and describe it.</FocusModal.Description>
								</div>
								<div className="grid grid-cols-2 gap-4">
									{/* Name */}
									<Controller
										control={form.control}
										name="name"
										render={({ field, fieldState }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Name
												</Text>
												<Input {...field} value={field.value} placeholder="product_viewed" />
												{fieldState.error && <span className="text-ui-fg-error text-sm">{fieldState.error.message}</span>}
											</div>
										)}
									/>

									{/* Label */}
									<Controller
										control={form.control}
										name="label"
										render={({ field, fieldState }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Label
												</Text>
												<Input {...field} value={field.value} placeholder="Product Viewed" />
												{fieldState.error && <span className="text-ui-fg-error text-sm">{fieldState.error.message}</span>}
											</div>
										)}
									/>

									{/* Description */}
									<Controller
										control={form.control}
										name="description"
										render={({ field }) => (
											<div className="col-span-2 flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Description
												</Text>
												<Textarea {...field} value={field.value ?? ''} placeholder="What triggers this event?" />
											</div>
										)}
									/>

									{/* Active */}
									<Controller
										control={form.control}
										name="active"
										render={({ field }) => (
											<div className="col-span-2 flex items-center gap-3">
												<Switch id="create-rubric-active-toggle" checked={field.value} onCheckedChange={field.onChange} />
												<label htmlFor="create-rubric-active-toggle" className="cursor-pointer text-sm">
													Active
												</label>
											</div>
										)}
									/>
								</div>
							</div>
						</FocusModal.Body>
					</form>
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
