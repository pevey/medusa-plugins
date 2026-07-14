import { getRequestEvent } from '$app/server'
import { getClient, getConfig } from './state'
import { resolveContext } from './context'
import type { MedusaContext } from '../types'

/** Resolve the Medusa context for the current request. */
export function requestContext(): MedusaContext {
	const { cookies } = getRequestEvent()
	return resolveContext(getClient(), getConfig(), cookies)
}
