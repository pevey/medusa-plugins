import * as zod from 'zod'
import {
	FocusModal,
	Heading,
	Text,
	Button,
	Input,
	Switch,
	Select,
	toast,
	usePrompt
} from '@medusajs/ui'
import { useEffect } from 'react'
import { FormProvider, Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { useStockLocations, useInventoryItems, useCreateStockLot } from '../hooks/stock-lots'

const schema = zod.object({
	inventory_item_id: zod.string().min(1, 'Required'),
	stock_location_id: zod.string().min(1, 'Required'),
	lot_number: zod.string().min(1, 'Required'),
	description: zod.string().nullable().optional(),
	stocked_quantity: zod.number().min(0),
	enabled: zod.boolean().default(true)
})
type CreateStockLotFormData = zod.infer<typeof schema>

type CreateStockLotDrawerProps = {
	open: boolean
	setOpen: (open: boolean) => void
}

export const CreateStockLotModal = ({ open, setOpen }: CreateStockLotDrawerProps) => {
	const { mutate: createLot, isPending } = useCreateStockLot()
	const { data: locationsData, isLoading: locationsLoading } = useStockLocations()
	const { data: inventoryData, isLoading: inventoryLoading } = useInventoryItems()
	const prompt = usePrompt()

	const form = useForm<CreateStockLotFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			inventory_item_id: '',
			stock_location_id: '',
			lot_number: '',
			description: '',
			stocked_quantity: 0,
			enabled: true
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
		createLot(data, {
			onSuccess: () => {
				toast.success('Stock lot created successfully')
				form.reset()
				setOpen(false)
			},
			onError: () => toast.error('Failed to create stock lot')
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
									<Heading className="capitalize">Create Stock Lot</Heading>
								</div>
								<div className="grid grid-cols-2 gap-4">
									{/* Inventory Item */}
									<Controller
										control={form.control}
										name="inventory_item_id"
										render={({ field }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Inventory Item
												</Text>
												{inventoryLoading ? (
													<Text size="small">Loading...</Text>
												) : (
													<Select value={field.value} onValueChange={field.onChange}>
														<Select.Trigger>
															<Select.Value placeholder="Select an inventory item" />
														</Select.Trigger>
														<Select.Content>
															{inventoryData?.inventory_items?.map(item => (
																<Select.Item key={item.id} value={item.id}>
																	{item.title}
																</Select.Item>
															))}
														</Select.Content>
													</Select>
												)}
											</div>
										)}
									/>

									{/* Stock Location */}
									<Controller
										control={form.control}
										name="stock_location_id"
										render={({ field }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Stock Location
												</Text>
												{locationsLoading ? (
													<Text size="small">Loading...</Text>
												) : (
													<Select value={field.value} onValueChange={field.onChange}>
														<Select.Trigger>
															<Select.Value placeholder="Select a location" />
														</Select.Trigger>
														<Select.Content>
															{locationsData?.stock_locations?.map(loc => (
																<Select.Item key={loc.id} value={loc.id}>
																	{loc.name}
																</Select.Item>
															))}
														</Select.Content>
													</Select>
												)}
											</div>
										)}
									/>

									{/* Lot Number */}
									<Controller
										control={form.control}
										name="lot_number"
										render={({ field }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Lot Number
												</Text>
												<Input {...field} placeholder="e.g. LOT-001" />
											</div>
										)}
									/>

									{/* Stocked Quantity */}
									<Controller
										control={form.control}
										name="stocked_quantity"
										render={({ field }) => (
											<div className="flex flex-col space-y-2">
												<Text size="small" weight="plus">
													Stocked Quantity
												</Text>
												<Input
													type="number"
													min={0}
													value={field.value}
													onChange={e => field.onChange(Number(e.target.value))}
												/>
											</div>
										)}
									/>

									{/* Description */}
									<Controller
										control={form.control}
										name="description"
										render={({ field }) => (
											<div className="flex flex-col space-y-2 col-span-2">
												<Text size="small" weight="plus">
													Description
												</Text>
												<Input
													{...field}
													value={field.value ?? ''}
													placeholder="Optional description"
												/>
											</div>
										)}
									/>

									{/* Enabled */}
									<Controller
										control={form.control}
										name="enabled"
										render={({ field }) => (
											<div className="flex items-center gap-3 col-span-2">
												<Switch
													id="enabled-toggle"
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
												<label
													htmlFor="enabled-toggle"
													className="text-sm cursor-pointer"
												>
													Enabled
												</label>
											</div>
										)}
									/>
								</div>
							</div>
						</FocusModal.Body>
					</form>
				</FormProvider>
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
			</FocusModal.Content>
		</FocusModal>
	)
}
