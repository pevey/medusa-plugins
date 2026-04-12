import { defineMiddlewares } from '@medusajs/framework/http'
import { customerTagRoutes } from './middlewares/customer-tags'

export default defineMiddlewares([...customerTagRoutes])
