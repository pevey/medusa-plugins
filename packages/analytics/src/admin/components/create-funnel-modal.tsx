import * as zod from 'zod'
import {
	FocusModal,
	Heading,
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
import { useCreateFunnel, useRubrics } from '../hooks/analytics'

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
type CreateFunnelFormData = zod.infer<typeof schema>

type CreateFunnelModalProps = {
	open: boolean
	setOpen: (open: boolean) => void
}

export const CreateFunnelModal = ({ open, setOpen }: CreateFunnelModalProps) => {
	const createFunnel = useCreateFunnel()
	const { data: rubricsData } = useRubrics({ limit: 100, active: true })
	const prompt = usePrompt()

	const customRubrics = rubricsData?.rubrics || []
	const customNames = new Set(customRubrics.map((r) => r.name))
	const allRubrics = [
		...SYSTEM_RUBRICS.filter((r) => !customNames.has(r.name)),
		...customRubrics
	]

	const form = useForm<CreateFunnelFormData>({
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
	}, [open, blocker])

	useEffect(() => {
		if (open) {
			form.reset({
				name: '',
				label: '',
				steps: [],
				is_default: false
			})
		}
	}, [open, form])

	const handleSubmit = form.handleSubmit((data) => {
		createFunnel.mutate(
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
					toast.success('Funnel created')
				},
				onError: (error: any) => toast.error(error.message || 'Failed to create funnel')
			}
		)
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
									<Heading className="capitalize">Create Funnel</Heading>
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
												<Input {...field} value={field.value} placeholder="main_funnel" />
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
												<Text size="small" weight="plus">
													Label
												</Text>
												<Input {...field} value={field.value} placeholder="Main Conversion Funnel" />
												{fieldState.error && (
													<span className="text-sm text-ui-fg-error">{fieldState.error.message}</span>
												)}
											</div>
										)}
									/>

									{/* Default */}
									<Controller
										control={form.control}
										name="is_default"
										render={({ field }) => (
											<div className="flex items-center gap-3 col-span-2">
												<Switch
													id="create-funnel-default-toggle"
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
												<label htmlFor="create-funnel-default-toggle" className="text-sm cursor-pointer">
													Set as default
												</label>
											</div>
										)}
									/>

									{/* Steps */}
									<div className="flex flex-col space-y-2 col-span-2">
										<Text size="small" weight="plus">
											Steps
										</Text>
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
								</div>
							</div>
						</FocusModal.Body>
					</form>
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
