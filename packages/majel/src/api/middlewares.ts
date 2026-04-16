import { defineMiddlewares } from '@medusajs/framework/http'
import { statisticsRoutes } from './middlewares/statistics'
import { webhookRoutes } from './middlewares/webooks'

export default defineMiddlewares({
	routes: [...statisticsRoutes, ...webhookRoutes]
})
