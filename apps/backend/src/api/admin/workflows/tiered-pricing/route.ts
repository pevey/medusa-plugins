// see https://docs.medusajs.com/resources/references/medusa-workflows/upsertVariantPricesWorkflow
// import type { AuthenticatedMedusaRequest, , MedusaResponse } from '@medusajs/framework/http'
// import { upsertVariantPricesWorkflow } from '@medusajs/medusa/core-flows'

// export async function GET(req: AuthenticatedMedusaRequest, , res: MedusaResponse) {
// 	const { result } = await upsertVariantPricesWorkflow(req.scope).run({
// 		input: {
// 			variantPrices: [
// 				{
// 					product_id: 'prod_01KFA6A4PZH90CT2FXN34EXB2P', // SnoreRx product ID
// 					variant_id: 'variant_01KFA6A4RNB2WV4A21R6TQ0ZKN', // SnoreRx variant ID
// 					prices: [
// 						// default price (quantity 1)
// 						{
// 							amount: 59.99,
// 							currency_code: 'usd',
// 							min_quantity: 1,
// 							max_quantity: 1
// 						},
// 						// discounted price when quantity >= 2
// 						{
// 							amount: 49.995,
// 							currency_code: 'usd',
// 							min_quantity: 2,
// 							max_quantity: 10
// 						}
// 					]
// 				},
// 				{
// 					product_id: 'prod_01KG0X177XE8NEZ3SNMJHDYCMH', // SnoreRx Plus product ID
// 					variant_id: 'variant_01KG0X179CJQAHG4124F96N7TA', // SnoreRx Plus variant ID
// 					prices: [
// 						// default price (quantity 1)
// 						{
// 							amount: 99.99,
// 							currency_code: 'usd',
// 							min_quantity: 1,
// 							max_quantity: 1
// 						},
// 						// discounted price when quantity >= 2
// 						{
// 							amount: 77.495,
// 							currency_code: 'usd',
// 							min_quantity: 2,
// 							max_quantity: 10
// 						}
// 					]
// 				}
// 			],
// 			previousVariantIds: []
// 		}
// 	})

// 	res.send(result)
// }
