import { defineMiddlewares } from '@medusajs/framework/http'
import { searchRoutes } from './middlewares/search'

export default defineMiddlewares({
	routes: [...searchRoutes]
})
