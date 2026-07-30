import { defineMiddlewares } from '@medusajs/framework/http'
import { definePolicies, generateResourcePolicies, requirePolicies } from 'medusa-plugin-access'

/**
 * REFERENCE — Usage Pattern A: backend-project-level gating.
 *
 * This is how the *operator of a backend* wires access control for a plugin
 * that does NOT gate itself. Here we gate `medusa-plugin-content`'s admin
 * routes from this project's own middlewares. Because the backend project has
 * deliberately installed `medusa-plugin-access` (it's in this app's
 * package.json), it imports the utilities directly from the package barrel —
 * no conditional `require` needed; a missing dependency here would be a genuine
 * build error the operator wants to see.
 *
 * Contrast with Usage Pattern B (plugin-level soft-integration) in
 * `packages/complaints/src/api/middlewares.ts`: there the complaints plugin
 * can't assume access is installed, so it wraps the same calls in
 * `try { require("medusa-plugin-access") } catch {}`. We deliberately target a
 * DIFFERENT resource here (`content` vs the plugin's `complaint`) so the two
 * examples don't both register the same routes.
 *
 * 1) Define the `content` resource's policies so content:read/create/update/
 *    delete become assignable in the roles UI + appear in me/permissions.
 */
definePolicies(generateResourcePolicies(['content']))

// 2) Gate the content admin routes behind the corresponding content permission.
//    The access plugin's global /admin/* guard enforces these.
requirePolicies({
	method: ['GET'],
	matcher: '/admin/content',
	policies: [{ resource: 'content', operation: 'read' }]
})
requirePolicies({
	method: ['GET'],
	matcher: '/admin/content/:collectionId',
	policies: [{ resource: 'content', operation: 'read' }]
})
requirePolicies({
	method: ['POST'],
	matcher: '/admin/content',
	policies: [{ resource: 'content', operation: 'create' }]
})
requirePolicies({
	method: ['POST'],
	matcher: '/admin/content/:collectionId',
	policies: [{ resource: 'content', operation: 'update' }]
})
requirePolicies({
	method: ['DELETE'],
	matcher: '/admin/content/:collectionId',
	policies: [{ resource: 'content', operation: 'delete' }]
})

export default defineMiddlewares({
	routes: []
})
