import { buildSessionHeader } from './session';
/** Pure resolution of the per-request Medusa context. Testable without SvelteKit. */
export function resolveContext(client, config, cookies) {
    const region_id = cookies.get(config.cookies.region) || config.defaultRegionId || '';
    const country_code = cookies.get(config.cookies.country) || config.defaultCountryCode || '';
    const sessionValue = cookies.get(config.cookies.session);
    return {
        client,
        region_id,
        country_code,
        headers: () => buildSessionHeader(sessionValue, config.backendSessionCookie)
    };
}
