import { defineMiddlewares } from '@medusajs/framework/http'
import { accessGuard, installRouteRegistry, registerRoutePolicies, requirePolicies } from '../utils'
import { coreRoutePolicies } from '../access-policies/core-route-policies'
import { adminAccessRoleRoutesMiddlewares } from './admin/access/roles/middlewares'
import { adminAccessPolicyRoutesMiddlewares } from './admin/access/policies/middlewares'
import { adminUserAccessRoleRoutesMiddlewares } from './admin/users/[id]/access/roles/middlewares'

// Record every route the app registers so coverage can be reported at boot. This
// module body runs during the API loader's scan phase, which completes before any
// route registers — so the hook is in place in time to see all of them.
installRouteRegistry()

// Feed our own routes' co-located policies:[] declarations into the guard registry.
registerRoutePolicies([...adminAccessRoleRoutesMiddlewares, ...adminAccessPolicyRoutesMiddlewares, ...adminUserAccessRoleRoutesMiddlewares])

// Full parity: gate the entire core admin surface (products, orders, …) using
// the pinned core route→policy declarations.
for (const route of coreRoutePolicies) {
	requirePolicies({
		matcher: route.matcher,
		method: route.methods,
		policies: route.policies
	})
}

export default defineMiddlewares({
	routes: [
		{ matcher: '/admin/*', middlewares: [accessGuard] },
		...adminAccessRoleRoutesMiddlewares,
		...adminAccessPolicyRoutesMiddlewares,
		...adminUserAccessRoleRoutesMiddlewares
	]
})
