import type { MedusaContext, ResolvedConfig } from '../types';
import type Medusa from '@pevey/medusa-sdk';
export interface CookieReader {
    get(name: string): string | undefined;
}
/** Pure resolution of the per-request Medusa context. Testable without SvelteKit. */
export declare function resolveContext(client: Medusa, config: ResolvedConfig, cookies: CookieReader): MedusaContext;
