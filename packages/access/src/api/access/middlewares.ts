import { MedusaNextFunction, MedusaRequest, MedusaResponse, MiddlewareRoute, authenticate } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, parseCorsOrigins } from '@medusajs/framework/utils'
import cors from 'cors'
import { accessNamespaceActorTypes, accessNamespaceCorsOverride } from '../../utils'

/**
 * `/access` is a top-level namespace, so none of core's per-namespace
 * middleware (`/admin` auth, `/store` publishable key) applies — CORS and
 * authentication are this file's responsibility. CORS runs first with
 * `preflightContinue: false`, so OPTIONS preflights (which carry no
 * Authorization header) are answered before authentication can 401 them.
 */

let corsFn: ReturnType<typeof cors> | undefined

const accessNamespaceCors = (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
	if (!corsFn) {
		const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
		const origin = accessNamespaceCorsOverride() ?? [http.adminCors, http.storeCors].filter(Boolean).join(',')
		corsFn = cors({ origin: parseCorsOrigins(origin), credentials: true, preflightContinue: false })
	}
	return corsFn(req, res, next)
}

// Actor types are read per request, so `configureAccessNamespace` calls from
// module loaders (which run after this file is scanned) are honored.
const accessNamespaceAuth = (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) =>
	authenticate(accessNamespaceActorTypes(), ['bearer', 'session'])(req, res, next)

export const accessNamespaceRoutesMiddlewares: MiddlewareRoute[] = [
	{
		matcher: '/access/*',
		middlewares: [accessNamespaceCors, accessNamespaceAuth]
	}
]
