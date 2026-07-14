import type { Handle } from '@sveltejs/kit';
import type { MedusaHandleConfig } from './types';
/**
 * Configure the shared Medusa client (once, at module-eval time) and mirror a
 * per-request MedusaContext onto `event.locals.medusa` for use in the consumer's
 * own load functions / endpoints. The library's remote functions resolve the same
 * context via `getRequestEvent()`, so they do not depend on this handle running.
 */
export declare function createMedusaHandle(config: MedusaHandleConfig): Handle;
