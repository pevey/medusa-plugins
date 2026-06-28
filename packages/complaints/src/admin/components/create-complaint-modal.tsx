import * as zod from 'zod'
import {
	Badge,
	FocusModal,
	Heading,
	Label,
	Text,
	Textarea,
	Button,
	Input,
	Select,
	Switch,
	toast,
	usePrompt
} from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { FormProvider, Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker, useNavigate } from 'react-router-dom'
import {
	useCustomerWithOrders,
	useOrder,
	useComplaintTags,
	useCreateComplaint,
	useUploadComplaintDocument,
	UploadProgress
} from '../hooks/complaints'
import { DocumentDropZone, formatFileSize } from './document-drop-zone'

const schema = zod
	.object({
		description: zod.string().min(1, 'Required'),
		customer_id: zod.string().min(1, 'Required'),
		order_id: zod.string().optional(),
		product_id: zod.string().optional(),
		actionable: zod.boolean(),
		reportable: zod.boolean(),
		tag_ids: zod.array(zod.string()).optional()
	})
	.refine((data) => !data.product_id || !!data.order_id, {
		message: 'Order is required when a product is selected',
		path: ['order_id']
	})
type CreateComplaintFormData = zod.infer<typeof schema>

type CreateComplaintDrawerProps = {
	open: boolean
	setOpen: (open: boolean) => void
	customerId: string
	orderId?: string
}

export const CreateComplaintModal = ({
	open,
	setOpen,
	customerId,
	orderId
}: CreateComplaintDrawerProps) => {
	const navigate = useNavigate()
	const { mutate: createComplaint, isPending } = useCreateComplaint()
	const prompt = usePrompt()

	const form = useForm<CreateComplaintFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			description: '',
			customer_id: customerId,
			order_id: orderId ?? '',
			product_id: '',
			actionable: false,
			reportable: false,
			tag_ids: []
		}
	})
	const { formState } = form
	const { isDirty } = formState

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

	const [success, setSuccess] = useState(false)

	type StagedFile = { id: string; file: File; percent: number; error?: string }
	const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const uploadDocument = useUploadComplaintDocument()

	let blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			isDirty &&
			formState.dirtyFields.description === true &&
			currentLocation.pathname !== nextLocation.pathname
	)

	const handleNavigate = async () => {
		if (blocker.state !== 'blocked') return
		if (success) {
			blocker.proceed()
			return
		}
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
	}, [isDirty, open, blocker])

	const handleFilesSelected = (files: File[]) => {
		setStagedFiles((prev) => [
			...prev,
			...files.map((file) => ({
				id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
				file,
				percent: 0
			}))
		])
	}

	const removeStagedFile = (id: string) => {
		setStagedFiles((prev) => prev.filter((s) => s.id !== id))
	}

	const uploadStagedFiles = async (complaintId: string) => {
		if (!stagedFiles.length) return
		setIsUploading(true)
		await Promise.all(
			stagedFiles.map((staged) =>
				uploadDocument(complaintId, staged.file, (p) => {
					setStagedFiles((prev) =>
						prev.map((s) => (s.id === staged.id ? { ...s, percent: p.percent } : s))
					)
				})
					.then(() => {
						setStagedFiles((prev) =>
							prev.map((s) => (s.id === staged.id ? { ...s, percent: 100 } : s))
						)
					})
					.catch((err: Error) => {
						setStagedFiles((prev) =>
							prev.map((s) =>
								s.id === staged.id ? { ...s, error: err.message, percent: 100 } : s
							)
						)
						toast.error(`Upload failed for ${staged.file.name}: ${err.message}`)
					})
			)
		)
		setIsUploading(false)
	}

	const handleSubmit = form.handleSubmit(data => {
		const payload = {
			...data,
			order_id: data.order_id || undefined,
			product_id: data.product_id || undefined
		}
		createComplaint(payload, {
			onSuccess: async result => {
				toast.success('Complaint created successfully')
				setSuccess(true)
				await uploadStagedFiles(result.complaint.id)
				form.reset()
				navigate(`/complaints/${result.complaint.id}`)
			},
			onError: () => toast.error('Failed to create complaint')
		})
	})

	if (!customerId) {
		return (
			<FocusModal open={open}>
				<FocusModal.Content>
					<FocusModal.Header>
						<Heading level="h2">Error</Heading>
					</FocusModal.Header>
					<FocusModal.Body>
						<Text>Customer ID is required to create a complaint.</Text>
					</FocusModal.Body>
				</FocusModal.Content>
			</FocusModal>
		)
	}

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
								<Button
									type="submit"
									size="small"
									isLoading={isPending || isUploading}
									disabled={isPending || isUploading}
								>
									{isUploading ? 'Uploading…' : 'Save'}
								</Button>
							</div>
						</FocusModal.Header>
						<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
								<div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
									<div>
										<Heading className="capitalize">Create Complaint</Heading>
									</div>
									<div className="grid grid-cols-1 gap-4">
										{/* Customer ID — pre-populated, read-only */}
										<Controller
											control={form.control}
											name="customer_id"
											render={({ field }) => (
												<div className="flex flex-col space-y-2">
													<Text size="small" weight="plus">
														Customer ID
													</Text>
													<Input {...field} disabled />
												</div>
											)}
										/>
										{/* Order */}
										<Controller
											control={form.control}
											name="order_id"
											render={({ field, fieldState }) => (
												<div className="flex flex-col space-y-2">
													<Text size="small" weight="plus">
														Order
													</Text>
													{customerLoading ? (
														<Text size="small">Loading orders...</Text>
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
																		{new Date(order.created_at).toLocaleString(
																			'en-US',
																			{
																				year: 'numeric',
																				month: 'short',
																				day: 'numeric'
																			}
																		)}{' '}
																		- #{order.display_id}
																	</Select.Item>
																))}
															</Select.Content>
														</Select>
													)}
													{fieldState.error?.message && (
														<Text size="small" className="text-ui-fg-error">
															{fieldState.error.message}
														</Text>
													)}
												</div>
											)}
										/>
										{/* Product */}
										<Controller
											control={form.control}
											name="product_id"
											render={({ field }) => (
												<div className="flex flex-col space-y-2">
													<Text size="small" weight="plus">
														Product
													</Text>
													{orderLoading ? (
														<Text size="small">Loading...</Text>
													) : (
														<Select
															value={field.value}
															onValueChange={field.onChange}
														>
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
										{/* Complaint Tags */}
										<div className="flex flex-col space-y-2">
											<Text size="small" weight="plus">
												Tags
											</Text>
											{/* Selected tags displayed as removable badges */}
											{selectedTagIds.length > 0 && (
												<div className="flex flex-wrap gap-2 mb-2">
													{selectedTagIds.map(tagId => {
														const tag = tagsData?.complaint_tags?.find(
															t => t.id === tagId
														)
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
													<Text size="small" weight="plus">
														Description
													</Text>
													<Textarea {...field} />
												</div>
											)}
										/>
										{/* Actionable */}
										<div className="flex items-center justify-between rounded-lg border border-ui-border-base p-3">
											<div>
												<Label htmlFor="ccm-actionable" size="small" weight="plus">
													Actionable
												</Label>
												<Text size="small" className="text-ui-fg-subtle">
													This complaint requires corrective action.
												</Text>
											</div>
											<Controller
												control={form.control}
												name="actionable"
												render={({ field }) => (
													<Switch
														id="ccm-actionable"
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												)}
											/>
										</div>
										{/* Reportable */}
										<div className="flex items-center justify-between rounded-lg border border-ui-border-base p-3">
											<div>
												<Label htmlFor="ccm-reportable" size="small" weight="plus">
													Reportable
												</Label>
												<Text size="small" className="text-ui-fg-subtle">
													This complaint must be reported to a regulator.
												</Text>
											</div>
											<Controller
												control={form.control}
												name="reportable"
												render={({ field }) => (
													<Switch
														id="ccm-reportable"
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												)}
											/>
										</div>
										{/* Documents */}
										<div className="flex flex-col space-y-2">
											<Text size="small" weight="plus">
												Documents
											</Text>
											<DocumentDropZone
												onFilesSelected={handleFilesSelected}
												disabled={isPending || isUploading}
											/>
											{stagedFiles.length > 0 && (
												<div className="mt-2 flex flex-col divide-y rounded-lg border border-ui-border-base">
													{stagedFiles.map((s) => (
														<div key={s.id} className="flex flex-col gap-y-1 px-3 py-2">
															<div className="flex items-center justify-between gap-x-2">
																<div className="flex min-w-0 flex-col">
																	<Text size="small" weight="plus" className="truncate">
																		{s.file.name}
																	</Text>
																	<Text size="xsmall" className="text-ui-fg-subtle">
																		{formatFileSize(s.file.size)}
																	</Text>
																</div>
																{isUploading || success ? (
																	<Text size="xsmall" className="text-ui-fg-subtle">
																		{s.error ? 'Failed' : `${s.percent}%`}
																	</Text>
																) : (
																	<button
																		type="button"
																		onClick={() => removeStagedFile(s.id)}
																		className="text-ui-fg-subtle hover:text-ui-fg-base text-sm"
																		aria-label={`Remove ${s.file.name}`}
																	>
																		✕
																	</button>
																)}
															</div>
															{(isUploading || success) && (
																<div className="h-1 w-full overflow-hidden rounded bg-ui-bg-subtle">
																	<div
																		className={`h-full transition-all ${
																			s.error
																				? 'bg-ui-tag-red-icon'
																				: 'bg-ui-fg-interactive'
																		}`}
																		style={{ width: `${s.percent}%` }}
																	/>
																</div>
															)}
															{s.error && (
																<Text size="xsmall" className="text-ui-fg-error">
																	{s.error}
																</Text>
															)}
														</div>
													))}
												</div>
											)}
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
