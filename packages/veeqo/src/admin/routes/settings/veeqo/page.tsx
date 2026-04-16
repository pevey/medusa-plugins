import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
	Container,
	Heading,
	Text,
	Button,
	Badge,
	DataTable,
	createDataTableColumnHelper,
	useDataTable,
	DataTablePaginationState,
	toast
} from '@medusajs/ui'
import { AdminProduct, AdminSalesChannel, AdminShippingOption, AdminStockLocation } from '@medusajs/framework/types'
import { useState, useMemo } from 'react'
import { AdminProductVariantWithVeeqo } from '../../../types'
import {
	useVeeqoSalesChannels,
	useSyncVeeqoSalesChannels,
	useVeeqoStockLocations,
	useSyncVeeqoStockLocations,
	useVeeqoShippingOptions,
	useSyncVeeqoShippingOptions,
	useVeeqoProducts,
	useVeeqoProductVariants,
	useSyncVeeqoProducts
} from '../../../hooks'

export const config = defineRouteConfig({ label: 'Veeqo Setup', rank: 50 })
export const handle = { breadcrumb: () => 'Veeqo Setup' }

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = ['Stock Locations', 'Shipping Options', 'Sales Channels', 'Products', 'Product Variants'] as const
type Step = 0 | 1 | 2 | 3 | 4

const StepIndicator = ({ currentStep }: { currentStep: Step }) => (
	<div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-8">
		{STEPS.map((label, index) => (
			<div key={label} className="flex flex-col md:flex-row md:items-center gap-2">
				<div className="flex items-center gap-2">
					<div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${index < currentStep ? 'bg-ui-bg-interactive text-white' : index === currentStep ? 'bg-ui-bg-interactive text-white ring-2 ring-ui-border-interactive ring-offset-2' : 'bg-ui-bg-subtle text-ui-fg-subtle'}`}>
						{index < currentStep ? '✓' : index + 1}
					</div>
					<Text size="small" weight={index === currentStep ? 'plus' : 'regular'} className={index === currentStep ? 'text-ui-fg-base' : 'text-ui-fg-subtle'}>
						{label}
					</Text>
				</div>
				{index < STEPS.length - 1 && <div className="ml-3 h-6 w-px bg-ui-border-base md:ml-2 md:h-px md:w-8" />}
			</div>
		))}
	</div>
)

// ─── Step 1: Stock Locations ───────────────────────────────────────────────────────

const salesChannelColumnHelper = createDataTableColumnHelper<AdminSalesChannel>()
const salesChannelColumns = [
	salesChannelColumnHelper.accessor('name', { header: 'Name' }),
	salesChannelColumnHelper.accessor(row => (row as any).description ?? '-', { id: 'description', header: 'Description' })
]

const SalesChannelsStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({ pageSize: limit, pageIndex: 0 })
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data, isLoading } = useVeeqoSalesChannels({ limit, offset })
	const { mutate: syncSalesChannels, isPending } = useSyncVeeqoSalesChannels()

	const missingSalesChannels = useMemo(() => data?.sales_channels.filter(sc => !sc.veeqo_channel?.veeqo_channel_id) ?? [], [data])
	const missingCount = missingSalesChannels.length

	const table = useDataTable({
		columns: salesChannelColumns, data: missingSalesChannels, getRowId: row => row.id,
		rowCount: missingCount, isLoading, pagination: { state: pagination, onPaginationChange: setPagination }
	})

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading level="h2">Sync Sales Channels</Heading>
				<Text size="small" className="text-ui-fg-subtle mt-1">The following Medusa sales channels are missing a linked Veeqo channel.</Text>
			</div>
			<DataTable instance={table}>
				<DataTable.Toolbar className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-between px-6 py-4">
					<div><Badge className="whitespace-nowrap mr-2" color={missingCount > 0 ? 'orange' : 'green'} size="base">{missingCount} missing</Badge></div>
					<Button size="small" onClick={() => syncSalesChannels(missingSalesChannels.map(sc => sc.id), { onSuccess: () => toast.success('Sales channels synced to Veeqo'), onError: () => toast.error('Failed to sync sales channels') })} isLoading={isPending} disabled={missingCount === 0 || isPending}>Sync All to Veeqo</Button>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
			<div className="flex justify-between mt-4">
				<Button variant="secondary" onClick={onBack}>← Back</Button>
				<Button onClick={onNext} disabled={missingCount > 0}>Next: Products →</Button>
			</div>
		</div>
	)
}

const stockLocationColumnHelper = createDataTableColumnHelper<AdminStockLocation>()
const stockLocationColumns = [
	stockLocationColumnHelper.accessor('name', { header: 'Name' }),
	stockLocationColumnHelper.accessor(row => row.address?.city ?? '-', { id: 'city', header: 'City' }),
	stockLocationColumnHelper.accessor(row => row.address?.country_code?.toUpperCase() ?? '-', { id: 'country_code', header: 'Country' })
]

const StockLocationsStep = ({ onNext }: { onNext: () => void }) => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({ pageSize: limit, pageIndex: 0 })
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data, isLoading } = useVeeqoStockLocations({ limit, offset })
	const { mutate: syncStockLocations, isPending } = useSyncVeeqoStockLocations()

	const missingStockLocations = useMemo(() => data?.stock_locations.filter(sl => !sl.veeqo_warehouse?.veeqo_warehouse_id) ?? [], [data])
	const missingCount = missingStockLocations.length

	const table = useDataTable({
		columns: stockLocationColumns, data: missingStockLocations, getRowId: row => row.id,
		rowCount: missingCount, isLoading, pagination: { state: pagination, onPaginationChange: setPagination }
	})

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading level="h2">Sync Stock Locations</Heading>
				<Text size="small" className="text-ui-fg-subtle mt-1">The following Medusa stock locations are missing a linked Veeqo warehouse.</Text>
			</div>
			<DataTable instance={table}>
				<DataTable.Toolbar className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-between px-6 py-4">
					<div><Badge className="whitespace-nowrap mr-2" color={missingCount > 0 ? 'orange' : 'green'} size="base">{missingCount} missing</Badge></div>
					<Button size="small" onClick={() => syncStockLocations(missingStockLocations.map(sl => sl.id), { onSuccess: () => toast.success('Stock locations synced to Veeqo'), onError: () => toast.error('Failed to sync stock locations') })} isLoading={isPending} disabled={missingCount === 0 || isPending}>Sync All to Veeqo</Button>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
			<div className="flex justify-end mt-4">
				<Button onClick={onNext} disabled={missingCount > 0}>Next: Shipping Options →</Button>
			</div>
		</div>
	)
}

// ─── Step 2: Shipping Options ────────────────────────────────────────────────────────

const shippingOptionColumnHelper = createDataTableColumnHelper<AdminShippingOption>()
const shippingOptionColumns = [
	shippingOptionColumnHelper.accessor('name', { header: 'Name' }),
	shippingOptionColumnHelper.accessor(row => row.type?.code ?? '-', { id: 'code', header: 'Code' })
]

const ShippingOptionsStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({ pageSize: limit, pageIndex: 0 })
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data, isLoading } = useVeeqoShippingOptions({ limit, offset })
	const { mutate: syncShippingOptions, isPending } = useSyncVeeqoShippingOptions()

	const missingShippingOptions = useMemo(() => data?.shipping_options.filter(so => !so.veeqo_delivery_method?.veeqo_delivery_method_id) ?? [], [data])
	const missingCount = missingShippingOptions.length

	const table = useDataTable({
		columns: shippingOptionColumns, data: missingShippingOptions, getRowId: row => row.id,
		rowCount: missingCount, isLoading, pagination: { state: pagination, onPaginationChange: setPagination }
	})

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading level="h2">Sync Shipping Options</Heading>
				<Text size="small" className="text-ui-fg-subtle mt-1">The following Medusa shipping options are missing a linked Veeqo delivery method.</Text>
			</div>
			<DataTable instance={table}>
				<DataTable.Toolbar className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-between px-6 py-4">
					<div><Badge className="whitespace-nowrap mr-2" color={missingCount > 0 ? 'orange' : 'green'} size="base">{missingCount} missing</Badge></div>
					<Button size="small" onClick={() => syncShippingOptions(missingShippingOptions.map(s => s.id), { onSuccess: () => toast.success('Shipping options synced to Veeqo'), onError: () => toast.error('Failed to sync shipping options') })} isLoading={isPending} disabled={missingCount === 0 || isPending}>Sync All to Veeqo</Button>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
			<div className="flex justify-between mt-4">
				<Button variant="secondary" onClick={onBack}>← Back</Button>
				<Button onClick={onNext} disabled={missingCount > 0}>Next: Sales Channels →</Button>
			</div>
		</div>
	)
}

// ─── Step 3: Sales Channels ───────────────────────────────────────────────────────

// ─── Step 4: Products ────────────────────────────────────────────────────────


const productColumnHelper = createDataTableColumnHelper<AdminProduct>()
const productColumns = [
	productColumnHelper.accessor('title', { header: 'Title' }),
	productColumnHelper.accessor('status', {
		header: 'Status',
		cell: ({ getValue }) => <Badge className="whitespace-nowrap mr-2" color={getValue() === 'published' ? 'green' : 'grey'} size="xsmall">{getValue()}</Badge>
	})
]

const ProductsStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({ pageSize: limit, pageIndex: 0 })
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data, isLoading } = useVeeqoProducts({ limit, offset })
	const { mutate: syncProducts, isPending } = useSyncVeeqoProducts()

	const missingProducts = useMemo(() => data?.products.filter(p => !p.veeqo_product?.veeqo_product_id) ?? [], [data])
	const missingCount = missingProducts.length

	const table = useDataTable({
		columns: productColumns, data: missingProducts, getRowId: row => row.id,
		rowCount: missingCount, isLoading, pagination: { state: pagination, onPaginationChange: setPagination }
	})

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading level="h2">Sync Products</Heading>
				<Text size="small" className="text-ui-fg-subtle mt-1">The following Medusa products are missing a linked Veeqo product.</Text>
			</div>
			<DataTable instance={table}>
				<DataTable.Toolbar className="grid grid-cols-1 md:grid-cols-2 justify-between gap-4 px-6 py-4">
					<div><Badge className="whitespace-nowrap mr-2" color={missingCount > 0 ? 'orange' : 'green'} size="base">{missingCount} missing</Badge></div>
					<Button size="small" onClick={() => syncProducts(missingProducts.map(p => p.id), { onSuccess: () => toast.success('Products synced to Veeqo'), onError: () => toast.error('Failed to sync products') })} isLoading={isPending} disabled={missingCount === 0 || isPending}>Sync All to Veeqo</Button>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
			<div className="flex justify-between mt-4">
				<Button variant="secondary" onClick={onBack}>← Back</Button>
				<Button onClick={onNext} disabled={missingCount > 0}>Next: Product Variants →</Button>
			</div>
		</div>
	)
}

// ─── Step 5: Product Variants ────────────────────────────────────────────────

const variantColumnHelper = createDataTableColumnHelper<AdminProductVariantWithVeeqo>()
const variantColumns = [
	variantColumnHelper.accessor('title', { header: 'Variant' }),
	variantColumnHelper.accessor(row => row.product?.title ?? '-', { id: 'product_title', header: 'Product' }),
	variantColumnHelper.accessor('sku', { header: 'SKU' })
]

const ProductVariantsStep = ({ onBack }: { onBack: () => void }) => {
	const limit = 15
	const [pagination, setPagination] = useState<DataTablePaginationState>({ pageSize: limit, pageIndex: 0 })
	const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

	const { data, isLoading } = useVeeqoProductVariants({ limit, offset })
	const { mutate: syncProducts, isPending } = useSyncVeeqoProducts()

	const missingVariants = useMemo(() => data?.variants.filter(v => !v.veeqo_sellable?.veeqo_sellable_id) ?? [], [data])
	const productIdsToSync = useMemo(() => [...new Set(missingVariants.map(v => v.product_id).filter(Boolean))], [missingVariants])
	const missingCount = missingVariants.length

	const table = useDataTable({
		columns: variantColumns, data: missingVariants, getRowId: row => row.id,
		rowCount: missingCount, isLoading, pagination: { state: pagination, onPaginationChange: setPagination }
	})

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading level="h2">Sync Product Variants</Heading>
				<Text size="small" className="text-ui-fg-subtle mt-1">The following Medusa product variants are missing a linked Veeqo sellable.</Text>
			</div>
			<DataTable instance={table}>
				<DataTable.Toolbar className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-between md:px-6 py-4">
					<div><Badge className="whitespace-nowrap mr-2" color={missingCount > 0 ? 'orange' : 'green'} size="base">{missingCount} missing</Badge></div>
					<Button size="small" onClick={() => syncProducts(productIdsToSync, { onSuccess: () => toast.success('Products with missing variants synced to Veeqo'), onError: () => toast.error('Failed to sync products') })} isLoading={isPending} disabled={productIdsToSync.length === 0 || isPending}>Sync All to Veeqo</Button>
				</DataTable.Toolbar>
				<DataTable.Table />
				<DataTable.Pagination />
			</DataTable>
			<div className="flex justify-start mt-4">
				<Button variant="secondary" onClick={onBack}>← Back</Button>
			</div>
		</div>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VeeqoSettingsPage = () => {
	const [currentStep, setCurrentStep] = useState<Step>(0)

	return (
		<Container className="py-8">
			<Heading level="h1">Veeqo Setup</Heading>
			<Text size="large" className="text-ui-fg-subtle mt-2 mb-6">Before Medusa can send orders to Veeqo for shipping, data in your Medusa store needs to be fully synced with Veeqo.</Text>
			<Text size="large" className="text-ui-fg-subtle mt-2 mb-6">Follow the steps below to check for critical data that is missing in Veeqo and needs to be synced.</Text>
			<StepIndicator currentStep={currentStep} />
			{currentStep === 0 && <StockLocationsStep onNext={() => setCurrentStep(1)} />}
			{currentStep === 1 && <ShippingOptionsStep onNext={() => setCurrentStep(2)} onBack={() => setCurrentStep(0)} />}
			{currentStep === 2 && <SalesChannelsStep onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />}
			{currentStep === 3 && <ProductsStep onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />}
			{currentStep === 4 && <ProductVariantsStep onBack={() => setCurrentStep(3)} />}
		</Container>
	)
}

export default VeeqoSettingsPage
