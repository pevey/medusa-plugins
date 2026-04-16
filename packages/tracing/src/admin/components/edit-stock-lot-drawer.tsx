import * as zod from 'zod'
import {
	Drawer,
	Heading,
	Label,
	Input,
	Button,
	Switch,
	Select,
	toast,
	usePrompt
} from '@medusajs/ui'
import { useEffect } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { AdminStockLot } from '../types'
import { useStockLocations, useInventoryItems, useUpdateStockLot } from '../hooks/stock-lots'

const schema = zod.object({
	lot_number: zod.string().min(1, 'Required'),
	description: zod.string().nullable().optional(),
	stocked_quantity: zod.number().min(0),
	enabled: zod.boolean(),
	inventory_item_id: zod.string().min(1, 'Required'),
	stock_location_id: zod.string().min(1, 'Required')
})
type EditStockLotFormData = zod.infer<typeof schema>

type EditStockLotDrawerProps = {
	stockLot: AdminStockLot | undefined
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditStockLotDrawer = ({ stockLot, open, setOpen }: EditStockLotDrawerProps) => {
	const updateMutation = useUpdateStockLot(stockLot?.id)
	const { data: locationsData, isLoading: locationsLoading } = useStockLocations()
	const { data: inventoryData, isLoading: inventoryLoading } = useInventoryItems()
	const prompt = usePrompt()

	const form = useForm<EditStockLotFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			lot_number: '',
			description: null,
			stocked_quantity: 0,
			enabled: true,
			inventory_item_id: '',
			stock_location_id: ''
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
	}, [stockLot, open, blocker])

	// Reset form when drawer opens
	useEffect(() => {
		if (stockLot && open) {
			form.reset({
				lot_number: stockLot.lot_number,
				description: stockLot.description ?? null,
				stocked_quantity: stockLot.stocked_quantity,
				enabled: stockLot.enabled,
				inventory_item_id: stockLot.inventory_item_id,
				stock_location_id: stockLot.stock_location_id
			})
		}
	}, [stockLot, open, form])

	const handleSubmit = form.handleSubmit(data => {
		updateMutation.mutate(data, {
			onSuccess: () => {
				form.reset()
				setOpen(false)
				toast.success('Stock lot updated successfully')
			},
			onError: () => toast.error('Failed to update stock lot')
		})
	})

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Stock Lot</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							{/* Inventory Item */}
							<Controller
								control={form.control}
								name="inventory_item_id"
								rules={{ required: 'Inventory item is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Inventory Item
										</Label>
										{inventoryLoading ? (
											<span className="text-sm text-ui-fg-subtle">Loading...</span>
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
								rules={{ required: 'Stock location is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Stock Location
										</Label>
										{locationsLoading ? (
											<span className="text-sm text-ui-fg-subtle">Loading...</span>
										) : (
											<Select value={field.value} onValueChange={field.onChange}>
												<Select.Trigger>
													<Select.Value placeholder="Select a stock location" />
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
								rules={{ required: 'Lot number is required' }}
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Lot Number
										</Label>
										<Input {...field} value={field.value} placeholder="e.g. LOT-001" />
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
										<Input
											{...field}
											value={field.value ?? ''}
											placeholder="Optional description"
										/>
									</div>
								)}
							/>

							{/* Stocked Quantity */}
							<Controller
								control={form.control}
								name="stocked_quantity"
								render={({ field }) => (
									<div className="flex flex-col space-y-2">
										<Label size="small" weight="plus">
											Stocked Quantity
										</Label>
										<Input
											type="number"
											min={0}
											value={field.value}
											onChange={e => field.onChange(Number(e.target.value))}
										/>
									</div>
								)}
							/>

							{/* Enabled */}
							<Controller
								control={form.control}
								name="enabled"
								render={({ field }) => (
									<div className="flex items-center gap-3">
										<Switch
											id="enabled-toggle"
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
										<label htmlFor="enabled-toggle" className="text-sm cursor-pointer">
											Enabled
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
