import * as zod from 'zod'
import {
	Badge,
	Drawer,
	Heading,
	Label,
	Input,
	Button,
	Select,
	Textarea,
	toast,
	usePrompt
} from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { useForm, Controller, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { AdminComplaint, ComplaintStatus } from '../types'
import {
	useCustomerWithOrders,
	useOrder,
	useComplaintTags,
	useUpdateComplaint
} from '../hooks/complaints'

const schema = zod.object({
	order_id: zod.string().min(1, 'Required'),
	product_id: zod.string().min(1, 'Required'),
	number: zod.number(),
	status: zod.enum(['open', 'closed'] satisfies [ComplaintStatus, ...ComplaintStatus[]]),
	description: zod.string().nullable().optional(),
	metadata: zod.record(zod.unknown()).nullable().optional(),
	tag_ids: zod.array(zod.string()).optional()
})
type EditComplaintFormData = zod.infer<typeof schema>

type EditComplaintDrawerProps = {
	complaint: AdminComplaint
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditComplaintDrawer = ({ complaint, open, setOpen }: EditComplaintDrawerProps) => {
	const updateMutation = useUpdateComplaint(complaint.id)
	const prompt = usePrompt()

	const form = useForm<EditComplaintFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			number: 0,
			status: 'open',
			description: null,
			order_id: '',
			product_id: '',
			metadata: null,
			tag_ids: []
		}
	})

	const customerId = complaint?.customer_id
	const selectedOrderId = useWatch({ control: form.control, name: 'order_id' })

	const { data: customerData, isLoading: customerLoading } = useCustomerWithOrders(customerId)
	const customerOrders = customerData?.customer.orders ?? []

	const { data: orderData, isLoading: orderLoading } = useOrder(selectedOrderId)

	// Deduplicate products from order line items
	const orderProducts = Object.values(
		(orderData?.order?.items ?? []).reduce(
			(acc: Record<string, { id: string; title: string }>, item) => {
				if (item.product_id && !acc[item.product_id]) {
					acc[item.product_id] = { id: item.product_id, title: item.product_title ?? '' }
				}
				return acc
			},
			{}
		)
	)

	const { data: tagsData } = useComplaintTags()
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
	const [tagSelectValue, setTagSelectValue] = useState<string>('')

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
	}, [complaint, open, blocker])

	// Reset form when drawer opens
	useEffect(() => {
		if (complaint && open) {
			form.reset({
				number: complaint.number,
				status: complaint.status,
				description: complaint.description ?? null,
				order_id: complaint.order_id,
				product_id: complaint.product_id,
				metadata: complaint.metadata ?? null,
				tag_ids: complaint.tags?.map(tag => tag.id) ?? []
			})
		}
	}, [complaint, open, form])

	const handleSubmit = form.handleSubmit(data => {
		updateMutation.mutate(data, {
			onSuccess: () => {
				form.reset()
				setOpen(false)
				toast.success('Complaint updated successfully')
			},
			onError: () => toast.error('Failed to update complaint')
		})
	})

	if (!complaint.id) {
		console.log(complaint)
		return null
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Complaint</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							{/* Customer ID — pre-populated, read-only */}
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Customer ID
								</Label>
								<Input placeholder={complaint?.customer_id} disabled />
							</div>
							{/* Order */}
							<Controller
								control={form.control}
								name="order_id"
								rules={{ required: 'Order is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Order <span className="text-red-500">*</span>
										</Label>
										{customerLoading ? (
											<Label size="small">Loading orders...</Label>
										) : (
											<Select
												value={field.value}
												onValueChange={value => {
													field.onChange(value)
													form.setValue('product_id', '')
												}}
											>
												<Select.Trigger>
													<Select.Value placeholder="Select an order from this customer" />
												</Select.Trigger>
												<Select.Content>
													{customerOrders.map(order => (
														<Select.Item key={order.id} value={order.id}>
															{new Date(order.created_at).toLocaleString('en-US', {
																year: 'numeric',
																month: 'short',
																day: 'numeric'
															})}{' '}
															- #{order.display_id}
														</Select.Item>
													))}
												</Select.Content>
											</Select>
										)}
									</div>
								)}
							/>
							{/* Product */}
							<Controller
								control={form.control}
								name="product_id"
								rules={{ required: 'Product is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Product
										</Label>
										{orderLoading ? (
											<span className="text-sm text-ui-fg-subtle">Loading...</span>
										) : (
											<Select value={field.value} onValueChange={field.onChange}>
												<Select.Trigger>
													<Select.Value placeholder="Select a product" />
												</Select.Trigger>
												<Select.Content>
													{orderProducts?.map(product => (
														<Select.Item key={product.id} value={product.id}>
															{product.title}
														</Select.Item>
													))}
												</Select.Content>
											</Select>
										)}
									</div>
								)}
							/>
							{/* Number */}
							{/* <Controller
								control={form.control}
								name="number"
								rules={{ required: 'Number is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Number
										</Label>
										<Input
											type="number"
											min={0}
											value={field.value}
											onChange={e => field.onChange(Number(e.target.value))}
										/>
									</div>
								)}
							/> */}
							{/* Status */}
							<Controller
								control={form.control}
								name="status"
								rules={{ required: 'Status is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Status
										</Label>
										<Select value={field.value} onValueChange={field.onChange}>
											<Select.Trigger>
												<Select.Value placeholder="Select status" />
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="open">Open</Select.Item>
												<Select.Item value="closed">Closed</Select.Item>
											</Select.Content>
										</Select>
									</div>
								)}
							/>
							{/* Complaint Tags */}
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Tags
								</Label>
								{/* Selected tags displayed as removable badges */}
								{selectedTagIds.length > 0 && (
									<div className="flex flex-wrap gap-2 mb-2">
										{selectedTagIds.map(tagId => {
											const tag = tagsData?.complaint_tags?.find(t => t.id === tagId)
											return (
												<div key={tagId} className="flex items-center gap-1">
													<Badge size="xsmall" color="blue">
														{tag?.value ?? tagId}
													</Badge>
													<button
														type="button"
														onClick={() =>
															setSelectedTagIds(prev =>
																prev.filter(id => id !== tagId)
															)
														}
														className="text-ui-fg-subtle hover:text-ui-fg-base text-xs"
														aria-label={`Remove tag ${tag?.value}`}
													>
														✕
													</button>
												</div>
											)
										})}
									</div>
								)}
								{/* Dropdown to add a tag */}
								<Select
									value={tagSelectValue}
									onValueChange={value => {
										if (value && !selectedTagIds.includes(value)) {
											setSelectedTagIds(prev => [...prev, value])
										}
										form.setValue('tag_ids', [...selectedTagIds, value], {
											shouldDirty: true
										})
										setTagSelectValue('') // reset after selection
									}}
								>
									<Select.Trigger>
										<Select.Value placeholder="Add a tag..." />
									</Select.Trigger>
									<Select.Content>
										{tagsData?.complaint_tags
											?.filter(tag => !selectedTagIds.includes(tag.id))
											.map(tag => (
												<Select.Item key={tag.id} value={tag.id}>
													{tag.value}
												</Select.Item>
											))}
									</Select.Content>
								</Select>
							</div>
							{/* Description */}
							<Controller
								control={form.control}
								name="description"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Description
										</Label>
										<Textarea {...field} value={field.value ?? ''} />
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
