import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminInventoryItem } from '@medusajs/framework/types'
import { Checkbox, Container, Heading, Text, Button, Label, Input, Select } from '@medusajs/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { sdk } from '../lib/sdk'
import { AdminStockLot } from '../types'

export const config = defineWidgetConfig({
	zone: 'inventory_item.details.side.before'
})

type StockLocation = {
	id: string
	name: string
}

const InventoryItemStockLotsWidget = ({
	data: inventoryItem
}: DetailWidgetProps<AdminInventoryItem>) => {
	const [selectedLocationId, setSelectedLocationId] = useState<string>('')
	const [showEnabledOnly, setShowEnabledOnly] = useState(true)
	const [showAddForm, setShowAddForm] = useState(false)
	const [newLotNumber, setNewLotNumber] = useState('')
	const [newQuantity, setNewQuantity] = useState(0)

	// Fetch all stock locations
	const { data: locationsData, isLoading: locationsLoading } = useQuery<{
		stock_locations: StockLocation[]
	}>({
		queryFn: () => sdk.client.fetch(`/admin/stock-locations`),
		queryKey: ['stock-locations']
	})

	// Build query string, conditionally adding enabled filter
	const lotsQueryString = [
		`inventory_item_id=${inventoryItem.id}`,
		`stock_location_id=${selectedLocationId}`,
		showEnabledOnly ? `enabled=true` : null
	]
		.filter(Boolean)
		.join('&')

	// Fetch stock lots for the selected location (and optional enabled filter)
	const {
		data: lotsData,
		isLoading: lotsLoading,
		refetch: refetchLots
	} = useQuery<{ stock_lots: AdminStockLot[] }>({
		queryFn: () => sdk.client.fetch(`/admin/stock-lots?${lotsQueryString}`),
		queryKey: ['stock-lots', inventoryItem.id, selectedLocationId, showEnabledOnly],
		enabled: !!selectedLocationId
	})

	const handleAddLot = async () => {
		await sdk.client.fetch(`/admin/stock-lots`, {
			method: 'POST',
			body: {
				inventory_item_id: inventoryItem.id,
				location_id: selectedLocationId,
				lot_number: newLotNumber,
				stocked_quantity: newQuantity
			}
		})
		setShowAddForm(false)
		setNewLotNumber('')
		setNewQuantity(0)
		refetchLots()
	}

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Stock Lots</Heading>
			</div>

			{/* Location Selector */}
			<div className="px-6 py-4">
				<Text size="small" weight="plus" leading="compact" className="mb-2">
					Stock Location
				</Text>
				{locationsLoading ? (
					<Text>Loading locations...</Text>
				) : (
					<Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
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

			{/* Enabled Filter Checkbox */}
			{selectedLocationId && (
				<div className="flex items-center gap-2 px-6 py-4">
					<Checkbox
						id="enabled-filter"
						checked={showEnabledOnly}
						onCheckedChange={checked => setShowEnabledOnly(checked === true)}
					/>
					<label htmlFor="enabled-filter" className="text-sm cursor-pointer">
						Show enabled lots only
					</label>
				</div>
			)}

			{/* Stock Lots List */}
			{selectedLocationId && (
				<div className="px-6 py-4">
					{lotsLoading ? (
						<Text>Loading lots...</Text>
					) : lotsData?.stock_lots?.length ? (
						lotsData.stock_lots.map(lot => (
							<div
								key={lot.id}
								className="grid grid-cols-4 gap-4 py-2 border-b text-ui-fg-subtle"
							>
								<Text size="small" weight="plus">
									{lot.lot_number}
								</Text>
								<Text size="small">Qty: {lot.stocked_quantity}</Text>
								<Text size="small">{lot.enabled ? 'Enabled' : 'Disabled'}</Text>
							</div>
						))
					) : (
						<Text size="small">No stock lots found for this location.</Text>
					)}
				</div>
			)}

			{/* Add New Lot */}
			{selectedLocationId && (
				<div className="px-6 py-4">
					{showAddForm ? (
						<div className="flex flex-col gap-3">
							<Label htmlFor="lot-number">New Lot Number</Label>
							<Input
								id="lot-number"
								placeholder="Lot number"
								value={newLotNumber}
								onChange={e => setNewLotNumber(e.target.value)}
							/>
							<Label htmlFor="stocked-quantity">Stocked Quantity</Label>
							<Input
								id="stocked-quantity"
								type="number"
								placeholder="Stocked quantity"
								value={newQuantity}
								onChange={e => setNewQuantity(Number(e.target.value))}
							/>
							<div className="flex gap-2">
								<Button size="small" onClick={handleAddLot}>
									Add Lot
								</Button>
								<Button
									size="small"
									variant="secondary"
									onClick={() => setShowAddForm(false)}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<Button size="small" variant="secondary" onClick={() => setShowAddForm(true)}>
							Add Stock Lot
						</Button>
					)}
				</div>
			)}
		</Container>
	)
}

export default InventoryItemStockLotsWidget
