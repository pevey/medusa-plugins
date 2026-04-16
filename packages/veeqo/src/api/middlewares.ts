import { defineMiddlewares, validateAndTransformBody } from '@medusajs/framework/http'
import {
	AdminSyncCustomerToVeeqo,
	AdminSyncOrderToVeeqo,
	AdminSyncProductToVeeqo,
	AdminSyncSalesChannelsToVeeqo,
	AdminSyncShippingOptionsToVeeqo,
	AdminSyncStockLocationsToVeeqo
} from './validators'

export default defineMiddlewares({
	routes: [
		{
			matcher: '/admin/veeqo/customers/sync',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminSyncCustomerToVeeqo)]
		},
		{
			matcher: '/admin/veeqo/orders/sync',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminSyncOrderToVeeqo)]
		},
		{
			matcher: '/admin/veeqo/products/sync',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminSyncProductToVeeqo)]
		},
		{
			matcher: '/admin/veeqo/sales-channels/sync',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminSyncSalesChannelsToVeeqo)]
		},
		{
			matcher: '/admin/veeqo/shipping-options/sync',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminSyncShippingOptionsToVeeqo)]
		},
		{
			matcher: '/admin/veeqo/stock-locations/sync',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminSyncStockLocationsToVeeqo)]
		}
	]
})
