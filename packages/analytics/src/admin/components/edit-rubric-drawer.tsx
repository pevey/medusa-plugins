import * as zod from 'zod'
import {
	Drawer,
	Heading,
	Label,
	Input,
	Button,
	Switch,
	Textarea,
	toast,
	usePrompt
} from '@medusajs/ui'
import { useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import type { AdminRubric } from '../types/analytics'
import { useUpdateRubric } from '../hooks/analytics'

const schema = zod.object({
	name: zod.string().min(1, 'Required').regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case').optional(),
	label: zod.string().min(1, 'Required').optional(),
	description: zod.string().nullable().optional(),
	active: zod.boolean().optional()
})
type EditRubricFormData = zod.infer<typeof schema>

type EditRubricDrawerProps = {
	rubric: AdminRubric | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditRubricDrawer = ({ rubric, open, setOpen }: EditRubricDrawerProps) => {
	const updateMutation = useUpdateRubric(rubric?.id ?? '')
	const prompt = usePrompt()

	const form = useForm<EditRubricFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '',
			label: '',
			description: null,
			active: true
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
	}, [rubric, open, blocker])

	// Reset form when drawer opens
	useEffect(() => {
		if (rubric && open) {
			form.reset({
				name: rubric.name,
				label: rubric.label,
				description: rubric.description ?? null,
				active: rubric.active
			})
		}
	}, [rubric, open, form])

	const handleSubmit = form.handleSubmit(data => {
		updateMutation.mutate(data, {
			onSuccess: () => {
				form.reset()
				setOpen(false)
				toast.success('Rubric updated successfully')
			},
			onError: () => toast.error('Failed to update rubric')
		})
	})

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Rubric</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							{/* Name */}
							<Controller
								control={form.control}
								name="name"
								render={({ field, fieldState }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Name
										</Label>
										<Input {...field} value={field.value ?? ''} placeholder="product_viewed" />
										{fieldState.error && (
											<span className="text-sm text-ui-fg-error">{fieldState.error.message}</span>
										)}
									</div>
								)}
							/>

							{/* Label */}
							<Controller
								control={form.control}
								name="label"
								render={({ field, fieldState }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Label
										</Label>
										<Input {...field} value={field.value ?? ''} placeholder="Product Viewed" />
										{fieldState.error && (
											<span className="text-sm text-ui-fg-error">{fieldState.error.message}</span>
										)}
									</div>
								)}
							/>

							{/* Description */}
							<Controller
								control={form.control}
								name="description"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Description
										</Label>
										<Textarea
											{...field}
											value={field.value ?? ''}
											placeholder="What triggers this event?"
										/>
									</div>
								)}
							/>

							{/* Active */}
							<Controller
								control={form.control}
								name="active"
								render={({ field }) => (
									<div className="flex items-center gap-3">
										<Switch
											id="active-toggle"
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
										<label htmlFor="active-toggle" className="text-sm cursor-pointer">
											Active
										</label>
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
