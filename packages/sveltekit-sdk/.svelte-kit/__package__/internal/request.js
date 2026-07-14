import { getRequestEvent } from '$app/server';
import { getClient, getConfig } from './state';
import { resolveContext } from './context';
/** Resolve the Medusa context for the current request. */
export function requestContext() {
    const { cookies } = getRequestEvent();
    return resolveContext(getClient(), getConfig(), cookies);
}
