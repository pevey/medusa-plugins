import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { VeeqoService } from '../../modules/veeqo/service'
import {
	ProductForVeeqoProductInput,
	ProductVariantForVeeqoProductInput,
	VeeqoProductDTO,
	VeeqoProductInput
} from '../../modules/veeqo/types'

const mapVariantToVeeqoVariantInput = (
	product: ProductForVeeqoProductInput,
	variant: ProductVariantForVeeqoProductInput,
	index: number
): VeeqoProductInput['product_variants_attributes'][number] => {
	const requiredFields = {
		title: variant.title,
		sku_code: variant.sku,
		price: variant.prices?.[0]?.amount
	}
	const missingFields = Object.entries(requiredFields)
		.filter(([, value]) => value === undefined || value === null)
		.map(([field]) => field)
	if (missingFields.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Product ${product.id} variant ${variant.id ?? index} is missing required fields for Veeqo product input: ${missingFields.join(', ')}`
		)
	}
	const veeqoSellableId = variant.veeqo_sellable?.veeqo_sellable_id
	return {
		...(veeqoSellableId !== undefined && veeqoSellableId !== null
			? { id: Number(veeqoSellableId) }
			: {}),
		title: requiredFields.title!,
		sku_code: requiredFields.sku_code!,
		weight: product.weight ?? 0,
		price: requiredFields.price!
	}
}

const mapProductToVeeqoProductInput = (product: ProductForVeeqoProductInput): VeeqoProductInput => {
	const requiredFields = {
		title: product.title,
		variants: product.variants
	}
	const missingFields = Object.entries(requiredFields)
		.filter(([, value]) => value === undefined || value === null)
		.map(([field]) => field)
	if (missingFields.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Product ${product.id} is missing required fields for Veeqo product input: ${missingFields.join(', ')}`
		)
	}
	if (!requiredFields.variants!.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Product ${product.id} must include at least one variant for Veeqo product input`
		)
	}
	const images_attributes = product.thumbnail
		? [
				{
					src: product.thumbnail,
					display_position: 1
				}
			]
		: undefined
	return {
		title: requiredFields.title!,
		notes: product.id, // store the Medusa product ID in the notes field to link the records
		...(images_attributes ? { images_attributes } : {}),
		product_variants_attributes: requiredFields.variants!.map((variant, index) =>
			mapVariantToVeeqoVariantInput(product, variant, index)
		)
	}
}

export const getProductDetailsStep = createStep(
	'get-product-details-step',
	async (productId: string, { container }) => {
		const query = container.resolve('query')
		const { data: products } = await query.graph({
			entity: 'product',
			fields: [
				'id',
				'title',
				'thumbnail',
				'weight',
				'veeqo_product.veeqo_product_id',
				'variants.id',
				'variants.title',
				'variants.sku',
				'variants.prices.amount',
				'variants.veeqo_sellable.veeqo_sellable_id'
			],
			filters: { id: productId }
		})
		const product = products[0] as ProductForVeeqoProductInput | undefined
		if (!product) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Product with id ${productId} not found`
			)
		}
		return new StepResponse(product)
	}
)

// GET --------------------------------------------------------------

export const fetchProductFromVeeqoStep = createStep(
	'fetch-product-from-veeqo-step',
	async (product_id: string, { container }) => {
		const query = container.resolve('query')
		const {
			data: [veeqo_product]
		} = await query.graph({
			entity: 'veeqo_product',
			fields: ['veeqo_product_id'],
			filters: { product_id }
		})
		const veeqoProductId = veeqo_product?.veeqo_product_id
		if (!veeqoProductId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo product found for product ${product_id}`
			)
		}
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoProduct = (await veeqoService.fetchProduct(veeqoProductId)) as VeeqoProductDTO
		return new StepResponse(veeqoProduct)
	}
)

export const getVeeqoProductWorkflow = createWorkflow(
	'get-veeqo-product-workflow',
	(product_id: string) => {
		const veeqoProduct = fetchProductFromVeeqoStep(product_id)
		return new WorkflowResponse(veeqoProduct)
	}
)

// ADD --------------------------------------------------------------

export const addProductToVeeqoStep = createStep(
	'add-product-to-veeqo-step',
	async (product: ProductForVeeqoProductInput, { container }) => {
		if (product.veeqo_product?.veeqo_product_id) {
			return new StepResponse(void 0)
		}
		const veeqoProductInput = mapProductToVeeqoProductInput(product)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoProduct = await veeqoService.addProduct(product, veeqoProductInput)
		return new StepResponse(veeqoProduct)
	}
)

export const addProductToVeeqoWorkflow = createWorkflow(
	'add-product-to-veeqo-workflow',
	(product_id: string) => {
		const product = getProductDetailsStep(product_id)
		const veeqoProduct = addProductToVeeqoStep(product)
		return new WorkflowResponse(veeqoProduct)
	}
)

// UPDATE -----------------------------------------------------------

export const updateProductInVeeqoStep = createStep(
	'update-product-in-veeqo-step',
	async (product: ProductForVeeqoProductInput, { container }) => {
		const veeqoProductId = product.veeqo_product?.veeqo_product_id
		if (!veeqoProductId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo product found for product ${product.id}`
			)
		}
		const veeqoProductInput = mapProductToVeeqoProductInput(product)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoProduct = await veeqoService.updateProduct(veeqoProductId, veeqoProductInput)
		return new StepResponse(veeqoProduct)
	}
)

const updateProductInVeeqoWorkflow = createWorkflow(
	'update-product-in-veeqo-workflow',
	(product_id: string) => {
		const product = getProductDetailsStep(product_id)
		const veeqoProduct = updateProductInVeeqoStep(product)
		return new WorkflowResponse(veeqoProduct)
	}
)

// SYNC -------------------------------------------------------------

export const addOrUpdateProductInVeeqoStep = createStep(
	'add-or-update-product-in-veeqo-step',
	async (product: ProductForVeeqoProductInput, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoProductId = product.veeqo_product?.veeqo_product_id
		if (!veeqoProductId) {
			const veeqoProductInput = mapProductToVeeqoProductInput(product)
			const veeqoProduct = await veeqoService.addProduct(product, veeqoProductInput)
			return new StepResponse(veeqoProduct)
		} else {
			const veeqoProductInput = mapProductToVeeqoProductInput(product)
			const veeqoProduct = await veeqoService.updateProduct(veeqoProductId, veeqoProductInput)
			return new StepResponse(veeqoProduct)
		}
	}
)

export const syncProductToVeeqoWorkflow = createWorkflow(
	'sync-product-to-veeqo-workflow',
	(product_id: string) => {
		const product = getProductDetailsStep(product_id)
		const veeqoProduct = addOrUpdateProductInVeeqoStep(product)
		return new WorkflowResponse(veeqoProduct)
	}
)

// DELETE -----------------------------------------------------------

export const findAndDeleteProductFromVeeqoStep = createStep(
	'find-and-delete-product-from-veeqo-step',
	async (product_id: string, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		await veeqoService.deleteProduct(product_id)
		return new StepResponse(void 0)
	}
)

const deleteProductFromVeeqoWorkflow = createWorkflow(
	'delete-product-from-veeqo-workflow',
	(product_id: string) => {
		const result = findAndDeleteProductFromVeeqoStep(product_id)
		return new WorkflowResponse(result)
	}
)
