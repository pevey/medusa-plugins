import type { Handle } from '@sveltejs/kit'
import { setConfig, getClient, getConfig } from './internal/state'
import { resolveContext } from './internal/context'
import type { MedusaHandleConfig, MedusaContext } from './types'

/**
 * Configure the shared Medusa client (once, at module-eval time) and mirror a
 * per-request MedusaContext onto `event.locals.medusa` for use in the consumer's
 * own load functions / endpoints. The library's remote functions resolve the same
 * context via `getRequestEvent()`, so they do not depend on this handle running.
 */
export function createMedusaHandle(config: MedusaHandleConfig): Handle {
  setConfig(config)
  return async ({ event, resolve }) => {
    // The consumer augments App.Locals with `medusa` (see README). The library
    // can't see that augmentation in its own typecheck, so assert the shape here.
    ;(event.locals as { medusa: MedusaContext }).medusa = resolveContext(getClient(), getConfig(), event.cookies)
    return resolve(event)
  }
}
