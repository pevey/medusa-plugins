import * as zod from 'zod'
import {
	Drawer,
	Heading,
	Label,
	Input,
	Button,
	Switch,
	Select,
	Text,
	toast,
	usePrompt
} from '@medusajs/ui'
import { Plus, Trash, ArrowUpMini, ArrowDownMini } from '@medusajs/icons'
import { useEffect } from 'react'
import { useForm, Controller, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import type { AdminFunnel } from '../types/analytics'
import { useUpdateFunnel, useRubrics } from '../hooks/analytics'

const BACKEND_RUBRIC_NAMES = [
	'cart_created', 'cart_updated', 'order_placed', 'order_canceled', 'order_completed',
	'shipment_created', 'customer_created', 'customer_updated', 'return_requested', 'return_received'
]

const toLabel = (name: string) =>
	name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const SYSTEM_RUBRICS = BACKEND_RUBRIC_NAMES.map((name) => ({ name, label: toLabel(name) }))

const schema = zod.object({
	name: zod.string().min(1, 'Required').regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case'),
	label: zod.string().min(1, 'Required'),
	steps: zod.array(zod.object({ value: zod.string().min(1, 'Required') })).min(1, 'At least one step required'),
	is_default: zod.boolean()
})
type EditFunnelFormData = zod.infer<typeof schema>

type EditFunnelDrawerProps = {
	funnel: AdminFunnel | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditFunnelDrawer = ({ funnel, open, setOpen }: EditFunnelDrawerProps) => {
	const updateMutation = useUpdateFunnel(funnel?.id || '')
	const { data: rubricsData } = useRubrics({ limit: 100, active: true })
	const prompt = usePrompt()

	const customRubrics = rubricsData?.rubrics || []
	const customNames = new Set(customRubrics.map((r) => r.name))
	const allRubrics = [
		...SYSTEM_RUBRICS.filter((r) => !customNames.has(r.name)),
		...customRubrics
	]

	const form = useForm<EditFunnelFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '',
			label: '',
			steps: [],
			is_default: false
		}
	})

	const { fields, append, remove, swap } = useFieldArray({
		control: form.control,
		name: 'steps'
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
	}, [funnel, open, blocker])

	useEffect(() => {
		if (funnel && open) {
			form.reset({
				name: funnel.name,
				label: funnel.label,
				steps: funnel.steps.map((s) => ({ value: s })),
				is_default: funnel.is_default
			})
		}
	}, [funnel, open, form])

	const handleSubmit = form.handleSubmit((data) => {
		updateMutation.mutate(
			{
				name: data.name,
				label: data.label,
				steps: data.steps.map((s) => s.value),
				is_default: data.is_default
			},
			{
				onSuccess: () => {
					form.reset()
					setOpen(false)
					toast.success('Funnel updated successfully')
				},
				onError: () => toast.error('Failed to update funnel')
			}
		)
	})

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Funnel</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							{/* Name */}
							<Controller
								control={form.control}
								name="name"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Name
										</Label>
										<Input {...field} value={field.value} placeholder="main_funnel" />
									</div>
								)}
							/>

							{/* Label */}
							<Controller
								control={form.control}
								name="label"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Label
										</Label>
										<Input {...field} value={field.value} placeholder="Main Conversion Funnel" />
									</div>
								)}
							/>

							{/* Default */}
							<Controller
								control={form.control}
								name="is_default"
								render={({ field }) => (
									<div className="flex items-center gap-3">
										<Switch
											id="edit-funnel-default-toggle"
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
										<label htmlFor="edit-funnel-default-toggle" className="text-sm cursor-pointer">
											Set as default
										</label>
									</div>
								)}
							/>

							{/* Steps */}
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Steps
								</Label>
								{fields.map((field, i) => (
										<div key={field.id} className="flex items-center gap-x-2">
											<Text size="small" leading="compact" className="text-ui-fg-subtle w-6">
												{i + 1}.
											</Text>
											<Controller
												control={form.control}
												name={`steps.${i}.value`}
												render={({ field: stepField }) => (
													<div className="flex-1">
														<Select value={stepField.value} onValueChange={stepField.onChange}>
															<Select.Trigger>
																<Select.Value placeholder="Select event" />
															</Select.Trigger>
															<Select.Content>
																{allRubrics.map((r) => (
																	<Select.Item key={r.name} value={r.name}>
																		{r.label} ({r.name})
																	</Select.Item>
																))}
															</Select.Content>
														</Select>
													</div>
												)}
											/>
											<Button
												size="small"
												variant="transparent"
												type="button"
												onClick={() => i > 0 && swap(i, i - 1)}
												disabled={i === 0}
											>
												<ArrowUpMini />
											</Button>
											<Button
												size="small"
												variant="transparent"
												type="button"
												onClick={() => i < fields.length - 1 && swap(i, i + 1)}
												disabled={i === fields.length - 1}
											>
												<ArrowDownMini />
											</Button>
											<Button
												size="small"
												variant="transparent"
												type="button"
												onClick={() => remove(i)}
											>
												<Trash />
											</Button>
										</div>
									))}
									<Button
										size="small"
										variant="secondary"
										type="button"
										onClick={() => append({ value: '' })}
									>
										<Plus /> Add Step
									</Button>
							</div>
						</Drawer.Body>
						<Drawer.Footer>
							<div className="flex items-center justify-end gap-x-2">
								<Drawer.Close asChild>
									<Button size="small" variant="secondary">Cancel</Button>
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
