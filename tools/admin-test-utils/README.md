# admin-test-utils

Renders Medusa plugin admin dashboard extensions in a real browser and validates every request they
make against the plugin's own zod validators.

Private dev tooling — it lives in `tools/`, not `packages/`, which is reserved for publishable
packages.

```bash
yarn test:admin                                  # every wired package
yarn workspace medusa-plugin-ratings test:admin  # one plugin
yarn workspace admin-test-utils test:admin       # this package's tests + the equivalence guard
```

Needs Playwright's Chromium (`yarn dlx playwright install chromium`). Nothing else — no Postgres, no
running backend.

## How it works

Vite aliases swap `@medusajs/framework/http` and `@medusajs/medusa/api/utils/validators` for shims,
so importing a plugin's real `src/api/middlewares.ts` inside a test yields the **live** zod schemas
and the exact `queryConfig` per route — data otherwise trapped in Express middleware closures. A
fake `sdk.client.fetch` then resolves each request to a route by `(method, matcher)`, `safeParse`s
it with the real schema, and answers from a fixture projected through `queryConfig.defaults`.

The point: a component that sends a request the real backend would reject fails here, loudly, in
about a second.

| File                             | Responsibility                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/config.ts`                  | `defineAdminTestConfig()` — the vitest config factory each plugin calls                       |
| `src/shims/framework-http.ts`    | Stand-in for `@medusajs/framework/http`; tags validators with `__schema` / `__queryConfig`    |
| `src/shims/medusa-validators.ts` | Stand-in for `createFindParams`, kept identical to Medusa's                                   |
| `src/contracts/load.ts`          | Builds the route map from the file system (existence) + `middlewares.ts` (schema/queryConfig) |
| `src/contracts/match.ts`         | Path matching; literal segments beat `:param`                                                 |
| `src/contracts/invariants.ts`    | No-DOM static checks (unwired validators, `defaultLimit`, declared fields)                    |
| `src/fake-sdk.ts`                | The validating fake `sdk.client.fetch`                                                        |
| `src/render.tsx`                 | Mounts a route component inside the providers the real dashboard supplies                     |

Wired today: `packages/ratings`, `packages/forms`.

## Adding a plugin

1. devDependencies: `"medusa-admin-test-utils": "workspace:*"` and `"vitest"` (exact-pinned). **Add nothing
   else** — `@tanstack/react-query`, `react-router-dom` and `@medusajs/*` come from the hoisted
   root, and a second copy breaks the shared React Query and router contexts.
2. scripts: `"test:admin": "vitest run"`.
3. `vitest.config.ts`:

   ```ts
   import { defineAdminTestConfig } from 'medusa-admin-test-utils/config'

   export default defineAdminTestConfig({ root: import.meta.dirname })
   ```

4. `src/admin/__tests__/setup.ts` — copy the one in `packages/ratings`, keeping the `currentFake`
   indirection (see below).
5. Tests go in `src/admin/__tests__/*.test.tsx`.

To typecheck the admin sources too, copy `packages/ratings/tsconfig.admin.json` and make `typecheck`
run both configs.

## Gotchas

Each of these cost real debugging time.

**`vi.resetModules()` does not evict an evaluated module graph in browser mode.** A second `mount()`
in one file re-runs `vi.doMock`, but the component keeps the sdk module it already imported — so it
talks to the _previous_ test's fake. It renders correctly while the new fake records **zero calls**,
so assertions on `fake.calls` silently inspect an object nothing touched. `installFake` therefore
stores the fake in a module-level `currentFake` the mocked `fetch` resolves at call time. Don't
"simplify" that away.

**`fake.calls` is recorded before validation.** Deliberate — it lets a test inspect a rejected
request. But a test asserting _only_ on `fake.calls` passes even when the request threw. If the
point is "the UI sends something the API accepts", also gate on a signal the component only produces
on success (a modal closing, a success toast).

**Two tsconfigs per plugin.** `src/admin/lib/sdk.ts` uses `import.meta.env`, which needs
`module: Preserve` / `moduleResolution: Bundler`. Putting those on the plugin's _server_ tsconfig
flips its emitted `.medusa/server/**/*.js` from CommonJS to ESM — and no plugin declares
`"type": "module"`, so that output breaks at runtime. Keep `src/admin` excluded from the server
config and typecheck it from `tsconfig.admin.json`.

**Routes are discovered from the file system, not `middlewares.ts`.** `middlewares.ts` supplies
schema/queryConfig for the routes that have them; it is never required just to make a route
_visible_. Pass a second argument to `loadRouteContracts`:

```ts
// in a plugin's src/admin/__tests__/setup.ts

// Read as raw text, NOT executed: a real route.ts pulls in @medusajs/framework/utils ->
// jsonwebtoken -> jws, which calls util.inherits — undefined once Vite externalizes Node's
// `util` for the browser test environment. Executing the module (eager, no `query`) crashes the
// whole suite import before a single test runs. `query: '?raw', import: 'default'` hands
// loadRouteContracts the source text instead, and it recovers the exported HTTP verbs by regex.
const routeModules = import.meta.glob('../../api/admin/**/route.ts', { eager: true, query: '?raw', import: 'default' })
export const contracts = loadRouteContracts(middlewares, { routeModules })
```

`loadRouteContracts`'s second argument is optional — omit it and behavior is unchanged from
before file-system discovery existed. The two sources merge on `(method, matcher)`: a route
present in both keeps the `middlewares.ts` schema/queryConfig (the glob only ever contributes
existence, never overrides a schema); a route present only on disk resolves with no contract to
validate against; a route present only in `middlewares.ts` (an entry with no on-disk file, which
should not happen but is not rejected) still resolves too.

**Selectors: check the DOM, don't trust the plan.** `@medusajs/ui`'s DataTable renders filter chips
that duplicate row text, Radix marks background content `aria-hidden` while a dialog is open (so
`.nth(1)` on a duplicated button name waits forever), and menu items are `role="menuitem"`, not
`button`. Prefer accessible names — icon-only action-menu triggers carry `aria-label="More actions"`.

**Browser suites can't run in parallel with each other.** They contend for the Playwright browser,
and all of them then fail reporting "no tests" while each passes alone. The root `test:admin` and
`test` scripts pass `--concurrency=1` for this reason.

## The equivalence guard

`src/__tests__/node/create-find-params-equivalence.test.ts` runs in **Node**, not the browser, and
compares this package's `createFindParams` shim against the real `@medusajs/medusa` implementation
across a 5 × 10 matrix of options and samples. It is the permanent protection against the shim
drifting from Medusa — if Medusa changes its defaults or coercion, this fails here rather than
letting every plugin's contract tests validate against a stale approximation. It runs as part of
`yarn workspace admin-test-utils test:admin`, which chains both suites.

**When you bump Medusa, bump it here too.** This package declares its own
`@medusajs/medusa` devDependency so the guard can import the real implementation. Package versions
in this repo are synced by hand, so nothing stops that pin from lagging the root's — and if it does,
the guard compares the shim against a _stale_ Medusa while the plugins run against the current one.
The single check whose entire job is detecting drift would itself be silently stale. Keep it equal
to the root's `@medusajs/*` version.

## Not covered

- **Query-string serialization.** The fake hands the responder the `query` object directly, so it
  never exercises the js-sdk's serializer (`status[]=a&status[]=b`). A UI/serializer mismatch
  surfaces only in the integration suite.
- **A real backend.** No HTTP, no DB, no auth — integration tests still own that.
- **Mutation response projection.** Only routes with a `queryConfig` are projected.
