import { Badge, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../lib/sdk'
import { ActionMenu } from '../../../components/action-menu'
import { SerialNumbersTable } from '../../../components/serial-numbers-table'
import { EditStockLotDrawer } from '../../../components/edit-stock-lot-drawer'
import { useStockLot, useDeleteStockLots } from '../../../hooks/stock-lots'

type StockLotLoaderData = { stock_lot: { id: string; lot_number: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<StockLotLoaderData>(`/admin/stock-lots/${id}`, { query: { fields: 'id,lot_number' } })
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<StockLotLoaderData>) =>
		data?.stock_lot?.lot_number || data?.stock_lot?.id || 'Stock Lot'
}

const StockLotDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useStockLot(id)
	const { mutate: deleteStockLots } = useDeleteStockLots()
	const stockLot = data?.stock_lot

	const handleDelete = async () => {
		const confirmed = await prompt({ title: 'Delete stock lot?', description: 'This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
		if (confirmed) {
			deleteStockLots([stockLot!.id], {
				onSuccess: () => { toast.success('Stock lot deleted successfully'); navigate('/stock-lots') },
				onError: () => toast.error('Failed to delete stock lot')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading...</Text></Container>
	if (!stockLot) return <Container className="p-6"><Text>Stock lot not found.</Text></Container>

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Stock Lot Details</Heading>
					<ActionMenu groups={[{ actions: [{ label: 'Edit', icon: <PencilSquare />, onClick: () => setEditOpen(true) }, { label: 'Delete', icon: <Trash />, onClick: handleDelete }] }]} />
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Lot Number</Text>
					<Text size="small" leading="compact">{stockLot.lot_number ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Description</Text>
					<Text size="small" leading="compact">{stockLot.description ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Stocked Quantity</Text>
					<Text size="small" leading="compact">{stockLot.stocked_quantity ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Status</Text>
					<Badge color={stockLot.enabled ? 'green' : 'grey'} size="xsmall">{stockLot.enabled ? 'Enabled' : 'Disabled'}</Badge>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Inventory Item</Text>
					<Text size="small" leading="compact">{stockLot.inventory_item?.title ?? stockLot.inventory_item_id ?? '-'}</Text>
				</div>
				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">Stock Location</Text>
					<Text size="small" leading="compact">{stockLot.stock_location?.name ?? stockLot.stock_location_id ?? '-'}</Text>
				</div>
			</Container>
			<SerialNumbersTable stockLotId={id!} />
			<EditStockLotDrawer stockLot={stockLot} open={editOpen} setOpen={setEditOpen} />
		</div>
	)
}

export default StockLotDetailPage
