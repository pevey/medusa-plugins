// `defineAdminTestConfig` is deliberately NOT re-exported here. It lives behind the
// `admin-test-utils/config` subpath because `config.ts` imports `vitest/config`,
// `@vitejs/plugin-react`, and `@vitest/browser-playwright` — Node-only tooling. This barrel is
// loaded INSIDE the browser by every plugin test, and pulling Vite's own toolchain in there
// makes the browser receive `__vite__injectQuery` twice ("Identifier '__vite__injectQuery' has
// already been declared") and the test file fails to import at all. Config-time and run-time
// exports must stay on separate entry points.
export { loadRouteContracts } from './contracts/load.js'
export type { ContractMap, RouteContract, ZodLike } from './contracts/load.js'
export { matchRoute } from './contracts/match.js'
export { assertContractInvariants } from './contracts/invariants.js'
export type { ContractInvariantInput } from './contracts/invariants.js'
export { createContractFake } from './fake-sdk.js'
export type { ContractFake, FetchOptions, Responder, ResponderContext } from './fake-sdk.js'
export { renderAdminRoute } from './render.js'
export type { RenderAdminRouteOptions, RenderAdminRouteResult } from './render.js'
