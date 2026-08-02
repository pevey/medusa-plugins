# medusa-plugin-access — redesign spec

Status: draft for review. Derived from a design session covering `medusa-permissions`
(tax1driver), Medusa core's `@medusajs/rbac`, and Vendure's permission system, plus four
feasibility probes against Medusa 2.18.0.

Everything in "Verified constraints" was checked against the shipped 2.18.0 build, not inferred.

---

## 1. Model

> **STATUS: grants and roles implemented; scope NOT implemented.** The Grant, Roles, and
> two-axes subsections describe shipped behaviour. Scope and Actors do not — see the status note
> on Scope below and Phase 3 in §8.

### Grant

A grant is `(resource, operation)`. Operations are a **closed, universally-applicable set**:

```
read | create | update | delete | export
```

`export` is present in `defaultOperations` as of Phase 0. **"Closed" is not yet enforced**:
`definePolicies` still appends any operation a caller passes to the global registry, and
`default-policy-operations.ts` snapshots that global at import time, making
`generateResourcePolicies` output load-order dependent. Tracked in §10.

The set is closed deliberately. Domain verbs (`approve`, `publish`, `sync`) are not operations —
they are `update` on the resource. `export` earns inclusion because it applies to essentially
every resource and carries a distinct risk profile (bulk extraction), which is the test.

Grants are what get assigned to roles and rendered in the admin UI. The policy matrix stays
`resources × 5 operations`.

### Scope

> **STATUS: NOT IMPLEMENTED, AND NOT IMPLEMENTABLE AS WRITTEN.** Everything in this subsection is
> design intent that two adversarial reviews found unsound — see Phase 3 in §8 for the specific
> false claims and structural problems. The most immediate: **`owner`-as-OR cannot be expressed**,
> because `PermissionAction` is a flat `{ resource, operation }` and `matchRoutePolicies` returns
> an array that `hasPermission` ANDs. Read the rest of this subsection as a starting point to be
> revised, not as a specification.

A scope determines **which instances** are reachable. Scopes are code-declared and
plugin-registerable. Two ship built in, and they attach at **different levels with different
semantics**, because they answer different questions.

| scope | attaches to | semantics |
|---|---|---|
| `owner` | the route declaration | **alternative satisfier (OR)** — hold the grant, *or* own the row |
| `sales_channel` | the role | **constraint (AND)** — hold the grant, *and* only within your channels |

**`owner` is OR.** A route declared `review:delete OR owner` is satisfied either by a role
granting `review:delete` or by owning the row. This matters because customers hold no roles at
all — a customer deleting their own review should not need a grant.

**`sales_channel` is AND.** `order:read OR sales_channel` would grant access to anyone in the
channel, which is backwards. The requirement is "hold `order:read`, and only within your
channels" — a constraint on every grant the role carries.

Vendure reaches the same split with two mechanisms: `Permission.Owner` inside the `@Allow` list,
versus role↔channel edges. These are not unifiable at the declaration level.

| declaration | meaning |
|---|---|
| `review:delete OR owner` | delete any review with the grant, or your own without it |
| `address:delete OR owner` | same for addresses |
| `order:delete` (no `owner`) | customers cannot delete their own orders |
| `order:read`, role scoped to channels | orders within your channels only |

They compose where needed — `order:read` on a channel-scoped role, declared `OR owner`, means
"orders in your channels, or your own." Filters OR together.

Whether a resource *supports* a given scope is a declaration-time decision per resource. This is
the analogue of Vendure's `ChannelAware` interface, made explicit rather than structural.

### Both scopes resolve to the same enforcement

Whatever the declaration semantics, **a scope produces a query filter**. "Check ownership of this
row" and "filter to owned rows" are the same operation at different cardinalities:

- `DELETE /store/reviews/:id` as `review:delete OR owner` — hold the grant → no filter, proceed.
  Don't → apply the owner filter → row not found → 404.
- `GET /store/reviews` same declaration — hold the grant → see all. Don't → see your own.
- Anonymous → no actor id → the owner filter cannot resolve → deny.

This is what makes it safe where Vendure's flag-and-hand-check isn't (see below).

### Ownership is one scope with per-resource predicates

"Affiliate sees only their own commissions" is not a new scope kind. It is `owner` with a
different predicate. Plugins register a resolver per resource:

```ts
defineOwnership({
  resource: 'affiliate_commission',
  filter: actor => ({ affiliate_id: actor.id })
})
```

**A scope produces a query filter, never a post-hoc row test.** This is a deliberate divergence
from Vendure, whose `Permission.Owner` sets a `ctx.authorizedAsOwnerOnly` flag that each resolver
must hand-check — their own docs concede that forgetting the check makes the endpoint equivalent
to `Public`. A filter cannot be forgotten: list routes narrow, single-resource routes 404, MCP
tools and workflow steps inherit it.

### Install-time behaviour — the most consequential thing the plugin does

This shipped long before this document existed and was never written down here. It belongs in §1
because it determines who holds what the moment the plugin is installed.

- **A `*:*` super-admin role is seeded on every boot.** `loaders/initial-data.ts` upserts
  `acrl_super_admin`, the `acpol_super_admin` policy (`*:*`), and the join between them, with
  fixed IDs. Deleting them via the API gets them recreated on restart.
- **On first load, every existing user is granted that role.** `bootstrap-super-admin.ts` runs via
  an event the module emits on `onApplicationStart`. `get-users-to-bootstrap.ts` returns the full
  user list — but only if **no** `user_access_role` link exists yet. One link anywhere disables
  the bootstrap permanently.

The rationale is lockout avoidance: enforcement is on the moment the module loads, so without this
an operator installs the plugin and immediately 403s out of their own admin. The consequences are
worth stating plainly:

- Existing users become super admins, silently.
- Users created *after* that first boot get **no** roles and are denied everywhere.
- A partially-bootstrapped store (one manual link created early) never gets the safety net.

- **Policies sync from code to DB on every boot.** `syncRegisteredPolicies` reconciles the global
  registry against `access_policy`: creates missing, restores soft-deleted, updates changed
  name/description, and **soft-deletes any DB policy with no code declaration** (`*:*` exempt). So
  a policy created through the API survives exactly until the next restart.

### Roles

- Roles hold grants. Multiple roles per actor; `hasPermission` unions across them.
- **Inheritance stays.** The `parent_id` / `parent_ids` mismatch that made it unreachable over
  HTTP is fixed (defect #2, §6).
- **No deny rules.** Any finite role set is expressible additively; deny only wins for
  "wildcard minus one thing". Vendure and Medusa core RBAC both landed additive-only
  independently.
### Two different axes — do not confuse them

| axis | semantics | where |
|---|---|---|
| **within** one declaration | **OR** | `review:delete OR owner` — either satisfies |
| **across** declarations | **AND** | floor + specific — you need both |

`matchRoutePolicies` returns the union of every guard whose matcher hits, and `hasPermission`
requires all of them. Core Medusa uses the same across-declaration semantics (46 hand-written
`/admin/<domain>/*` read floors).

The AND is load-bearing: it is how a sub-resource becomes *harder* to reach than its parent. The
`/admin/complaints/*` floor gives `complaint:update`; a specific declaration on the activities
routes adds `complaint_activity:update`; you need both. Coarse→fine tightening is non-breaking,
fine→coarse would be a silent widening.

#### Constraint — floors defeat OR-declarations

The two axes interact badly if mixed:

```
/store/reviews/*          → review:read              (floor)
DELETE /store/reviews/:id → review:delete OR owner
```

Effective requirement is `review:read AND (review:delete OR owner)`. A customer who owns the
review still fails, because they hold no `review:read` grant — the floor neutralizes the OR.

**Rule: do not put subtree floors over routes where ownership is a valid satisfier.**
`guardResource` is an admin-surface tool. Customer- and portal-facing prefixes get per-route
declarations instead. The failure mode otherwise is a 403 that looks like a scope bug and isn't.

### Actors and role attachment

`access_role` links to more than admin users:

| actor type | resolves roles via |
|---|---|
| `user` | direct link |
| `customer` | **through `customer_group`** |
| `affiliate` (future) | direct link |

**Customers get roles through groups, not individually.** Groups already exist, already have
membership UI, and are already how merchants segment customers. Per-customer role assignment
would not scale.

This also means the group driving wholesale pricing (price lists) is the same group driving
wholesale access — one source of truth rather than two that drift.

Wholesale flow:

1. Group "Wholesale" ↔ role "Wholesale Buyer", role constrained to `sales_channel: [wholesale]`
2. Request resolves to the wholesale channel → actor is a customer → groups → roles → channels →
   in set → allowed
3. Retail customer → retail group → retail channel only → denied
4. Anonymous → no groups → no roles → no channels → denied

**Consequence — the guard needs a per-actor-type resolver registry.** The current hardcoded
`query.graph({ entity: actorType, fields: ['access_roles.id'] })` only works for direct links.
This is Vendure's actor-provider concept arriving by a different road.

**Consequence — the dead permission cache becomes a prerequisite.** Resolving customer → groups →
roles → channels is two or three graph hops on every storefront request. We resolve live rather
than baking roles into the JWT (correct, and better than core), which makes defect #4 a Phase 3
blocker rather than housekeeping.

---

## 2. Declaration and binding

> **STATUS: IMPLEMENTED, but this section is not an accurate description of the code.** The
> mechanisms all ship — `guardResource`, `sealNamespace`, `withPolicies`, the `traceRoute` route
> registry, the coverage report, the drift report. Read it as design intent, and note these
> divergences:
>
> - **The `guardResource` table below is incomplete.** The code emits **seven** guards, not six:
>   `PUT`/`PATCH` → `update` on the prefix, and `POST`/`PUT`/`PATCH` → `update` on the subtree.
> - **The `traceRoute` code sketch below does not match the implementation.** It shows the hook
>   wrapping the handler to enforce. It does not: it calls `requirePolicies` into the same
>   path-keyed registry, and enforcement stays in the `/admin/*` middleware. See §3 Layer 1.
> - **"replaces … `compileMatcher` … and the pinned `core-route-policies.ts`" is retracted.**
>   See Phase 2 in §8. `compileMatcher` is still in use and all 352 pinned declarations still load.
> - **`withPolicies` has no production call site** in either in-scope package. The capability
>   ships; no route uses it yet.
> - Guards carry a `source` (`explicit` | `guardResource`) so drift reporting ignores deliberate
>   over-generation. Note `source` is a public parameter on `requirePolicies`, so a caller can
>   self-exempt.
> - Request paths are normalized (case-insensitive, trailing/duplicate slashes collapsed,
>   HEAD→GET) — defects 10–13 in §6. Percent-encoding and `..` segments are **not** normalized.

### `guardResource`

Collapses a resource's whole HTTP surface into one call:

```ts
guardResource({ resource: 'complaint', prefix: '/admin/complaints' })
```

| pattern | method | policy |
|---|---|---|
| `/admin/complaints` | GET | `complaint:read` |
| `/admin/complaints` | POST | `complaint:create` |
| `/admin/complaints` | DELETE | `complaint:delete` |
| `/admin/complaints` | PUT, PATCH | `complaint:update` |
| `/admin/complaints/*` | GET | `complaint:read` |
| `/admin/complaints/*` | POST, PUT, PATCH | `complaint:update` |
| `/admin/complaints/*` | DELETE | `complaint:delete` |

POST on a subtree maps to `update`, not `create` — `POST /admin/complaints/:id/activities`
creates an activity but is modifying the complaint. `create` is reserved for `POST /<prefix>`.

This diverges from core deliberately: core's subtree floor is `read` for *all* methods, so an
undeclared DELETE under the subtree needs only `read`. Mapping per method closes that.

Sub-resources needing stricter treatment layer on top, and union makes that strictly harder:

```ts
requirePolicies({
  matcher: '/admin/complaints/:id/activities*',
  method: ['POST', 'DELETE'],
  policies: [{ resource: 'complaint_activity', operation: 'update' }]
})
```

Coarse→fine tightening is non-breaking. Fine→coarse is a silent widening. **Start coarse.**

### Handler-attached binding

URL organization must stop being load-bearing for authorization. `ApiLoader.traceRoute` is the
seam — a public writable static called for every route with the **original** handler reference,
before any wrapping:

```js
const handler = _a.traceRoute
  ? _a.traceRoute(route.handler, { route: route.matcher, method: route.method })
  : route.handler;
```

Shape:

```ts
const registry = new WeakMap()
export function withPolicies(policies, handler) {
  registry.set(handler, policies)
  return handler
}

// installed from the plugin's api/middlewares.ts module body,
// which runs during the scan phase — before any route registers
const prev = globalThis.__ACCESS_PREV_TRACE_ROUTE__ ?? ApiLoader.traceRoute
globalThis.__ACCESS_PREV_TRACE_ROUTE__ = prev
ApiLoader.traceRoute = (handler, route) => {
  const next = prev ? prev(handler, route) : handler
  const policies = registry.get(handler) ?? matchByMatcher(route)
  if (!policies?.length) return next
  return async (req, res) => { await enforce(policies, req); return next(req, res) }
}
```

**This is a hybrid by necessity.** We cannot edit core's route exports, so core routes stay
matcher-keyed — but `traceRoute` hands us `route.matcher` exactly as core declared it, which
replaces both our hand-rolled `compileMatcher` regexes and the 3,543-line pinned
`core-route-policies.ts` drift problem with matchers sourced from the running app.

### `sealNamespace`

Opt-in fail-closed for a prefix you own. Global fail-open stays the default — third-party routes
cannot be assumed access-aware, and both Medusa and Vendure depend on that for extensibility.

Prefix matching **must be segment-aware**:

```ts
const isUnder = (path, prefix) => path === prefix || path.startsWith(prefix + '/')
```

Naive `startsWith` would make `sealNamespace('/admin/order')` silently seal `/admin/orders`.
Today complaints is safe only by accident (`/admin/complaint-tags` diverges before the `s`).

Sealing is opt-in for you but **binding on anyone who extends your prefix** — a third party
adding `/admin/complaints/:id/escalate` gets a 403 until they declare a policy. Accept and
document this as the contract of extending a sealed namespace.

Order-independent by design: `sealNamespace` writes to its own registry and the check happens
per-request, so module-load order cannot affect it.

### Coverage report

Because `traceRoute` sees every route at **registration** time, coverage becomes a boot-time
enumeration rather than a runtime diagnostic — something a `/admin/*` middleware structurally
cannot do. Emits the list of `/admin/*` routes with no matching declaration.

This is the tool you run **before** sealing a namespace. Neither Vendure nor Medusa core has
any equivalent; there is no prior art to borrow.

---

## 3. Enforcement

Three layers, each with a different reach. **Layer 1 is built; Layer 3 is partial; Layer 2 is not built.**

### Layer 1 — Gate — IMPLEMENTED

"Does this actor hold `(resource, operation)` at all?" A global `/admin/*` middleware
(`accessGuard`) matches the request against the route→policy registry and 403s when the actor's
roles do not grant every required policy. Declarations reach the registry three ways:
`guardResource` (whole CRUD surface + subtree floor), `requirePolicies` (explicit, for stricter
overrides), and `withPolicies` (handler-bound, matcher supplied by Medusa's own registration via
`ApiLoader.traceRoute`). `sealNamespace` opts a prefix into fail-closed; the global default stays
fail-open.

Note this is still **matcher-keyed** at enforcement time. `withPolicies` removes hand-written
matchers for routes we own, but policies land in the same path-keyed registry — so a
`guardResource` subtree floor still applies on top. Handler binding fixes authoring, not
composition.

### Layer 2 — Row filter (query interceptor) — NOT BUILT

Deferred with Phase 3/4. "Which rows?" would be injected into `query.graph` / `query.index`,
below the route, so it applies to every caller. The seam is verified to exist (`query` is
registered with `asValue` as a plain callable; Awilix scope registration shadows the parent), but
the hazards in §5 and the argument-shape problems noted in Phase 3 remain unresolved.

### Layer 3 — Field pruning — PARTIALLY BUILT

The **post-query** pass exists: `installFieldFilter` patches `res.json` and strips paths whose
terminal entity the actor cannot `read`. It is entity-grain (never scalars), fails open on error,
and only covers responses that go through `res.json` with a populated `queryConfig`.

The **pre-query** half is not built. It was to live in the Layer 2 interceptor, so it is blocked
on the same deferral. `queryConfig.allowed/restricted/disallowed` are off limits (§4).

---

## 4. Verified constraints

These are checked against shipped 2.18.0. They are limits of the design, to be stated rather
than rediscovered.

### No nested row filtering

`query.graph` cannot filter a nested collection. From
`@medusajs/query/dist/joiner/cross-module-joins/index.js`:

> *"Pushed-down filters restrict the ROOT rows — matching `query.index` semantics — and are
> pruned from the query. Expand nodes that existed only to carry those filters are dropped so
> they never trigger a fetch."*

`filters: { orders: {...} }` on a customer query returns *customers who have a matching order*,
with all their orders hydrated unfiltered. Same-module relations land in the same place via root
`where` + MikroORM `PopulateHint.ALL`. `query.index`'s `joinFilters` is a genuine nested
primitive but `Query.index()` runs it `idsOnly: true` and re-hydrates through `graph` with an id
list, discarding it.

Note the distinction, because it determines what an upstream fix could buy:

- **Cross-module relations** (`customer.orders` — Customer→Order) are executed as a *separate
  fetch per module boundary*, and `ModuleDataFetcher` narrows the child fetch correctly when a
  filter survives on the expand node. The transport already supports nested filtering; only
  `pruneFiltersFromExpand` removes it. One narrow upstream change away.
- **Same-module relations** (`order.items`) go through root `where` + `PopulateHint.ALL` and
  would additionally need `populateWhere` plumbed through `buildQuery`. No such path exists —
  pricing and order both had to reach around it with hand-written `populateWhere` inside their
  own modules. A second, larger change.

A `Query.applyAccessControl` mutation hook would **not** deliver nested scoping. It only supplies
an injection point before normalization; the hoist-and-prune happens downstream inside
`toRemoteQuery`/compile. We can already inject by wrapping.

**Consequence:** row scoping is sound where the scoped entity is the **root**, and degrades to
field-path denial for nested access.

- **Affiliate portal** — root entity *is* the scoped entity. Fully solvable.
- **Wholesale** — `/store/products` is root-scoped on product; core already scopes channels this
  way via `maybeApplyLinkFilter` pre-resolving to a root id list. Solvable. The cart write path
  needs a deny check, not a filter.
- **Admin cross-channel** — `GET /admin/customers?fields=orders.*` is a real bypass with no fix
  short of an upstream change. Out of scope by prior decision.

### No scalar / column-level control

The field filter is entity-grain. It can strip `customer.groups`; it can never strip
`customer.email`, `target_headers`, `form_submission.data`, `ip_address`, or revenue aggregates.
Vendure has the same limit — its `requiresPermission` reaches only custom fields and
settings-store fields, never built-in columns.

**Decision:** field-level (scalar) access control is out of scope. Sensitive scalars are fixed in
the plugins that return them, not by a generic filter.

### No dependency on core RBAC — hard rule

Core's `@medusajs/rbac` module and its associated machinery are off limits. The feature flags
will be removed and the licence is expected to change; anything we build on it is guaranteed to
break. It is a learning reference only.

**Specifically ruled out:** `req.restrictedFields`, `RBACFieldFilter`, `req.policies`, the
`rbac` / `rbac_filter_fields` flags, and `wrapWithPoliciesCheck`.

**The dividing line is query layer vs RBAC module.** Verified against the shipped build:
`@medusajs/query` depends only on `@medusajs/deps` and `@medusajs/utils`, contains zero
references to rbac, and its cross-module-join machinery is not feature-flagged. It is the
data-access path every `query.graph` call goes through. `@medusajs/rbac` is a discrete feature
module.

#### Dependency map

| Off limits — core RBAC | Safe — query layer | Safe — framework/http |
|---|---|---|
| `RBACFieldFilter` | `query.graph` / `query.index` | `ApiLoader.traceRoute` |
| `AllowedFieldFilter`, `RestrictedFieldFilter`, `DisallowedFieldFilter` | `QUERY` / `REMOTE_QUERY` registrations | `routes-loader`, `wrapHandler`, `RoutesSorter` |
| `IFieldFilter` and its composition in `prepareListQuery` | `toRemoteQuery`, joiner, `cross-module-joins` | `maybeApplyLinkFilter` |
| `queryConfig.allowed` / `restricted` / `disallowed` | `pruneFiltersFromExpand`, `ModuleDataFetcher` | |
| `req.restrictedFields`, `req.policies` | `@Cached` on graph/index, `QueryContext` | |
| `rbac` / `rbac_filter_fields` flags | | |
| `wrapWithPoliciesCheck`, `checkPermissions` | | |
| core `has-permission.ts`, `rbac_role` / `rbac_policy` | | |
| **`MiddlewareRoute.policies`** — core's field; we use `accessPolicies` (defect 15, §6) | | |

All nested-filtering analysis comes from the query column.

The three field-filter classes are treated as RBAC code, along with any core code that consumes
them. **We rely on no core field filtering for security.** All field pruning is our own, in the
interceptor.

#### Boundary note — `validateAndTransformQuery`

`prepareListQuery` consumes the off-limits filter classes, and `validateAndTransformQuery` calls
it. We continue to use `validateAndTransformQuery` as a Zod validator and field parser — that is
the ordinary Medusa route contract — but treat none of its field-filtering behaviour as doing
security work.

This costs us nothing: the interceptor reads `queryOptions.fields` at `query.graph`, downstream
of `prepareListQuery` entirely, so no security-relevant path runs through it.

For context on why `req.restrictedFields` looked attractive and isn't: the *application* of all
three field filters is gated behind `rbac_filter_fields` (default `false`), so
`req.restrictedFields.add([...])` is a no-op out of the box — and the classes behind it are off
limits regardless.

*Provenance note (not legal advice):* `access-field-filter.ts` is a 451-line fork of core's
`rbac-field-filter.ts`, taken while that code was MIT. That file is now firmly in the off-limits
column, so the fork must stop being treated as a reference to sync against. **Plan: clean-room
reimplementation** of the path→entity resolution, written from the joiner-config contract
(alias map → canonical entity → snake_case) rather than from core's file.

### Field pruning belongs in the query interceptor

Because the interceptor (Layer 2) already has to exist for row scoping, and it sees
`queryOptions.fields` before normalization, field pruning happens there too — not in
`prepareListQuery`.

This is strictly better than the `req.restrictedFields` route on every axis: no feature-flag
dependency, no core-RBAC dependency, and **better coverage**. The ~16 admin GET routes that never
touch `prepareListQuery` — including `/admin/orders/:id/preview`, which returns a fully-expanded
order — plus the ~30 `refetchEntity` calls with hardcoded field arrays all still go through
`query.graph`.

**The post-query filter stays as the final attempt to filter**, but becomes much thinner: it now
only covers responses not built from `query.graph` at all (raw module-service calls, third-party
handlers). Log the exception instead of swallowing it silently; still emit.

### Fail-open is the global default

Confirmed as the right call and shared by both references. Vendure's docs claim deny-by-default;
its code does `if (permissions.length === 0) return true`. Medusa core is the same. Extensibility
requires it. `sealNamespace` is our own invention for opting back out.

---

## 5. Hazards

Each of these will silently produce a wrong result if missed.

### Circular dependency in the query interceptor

`hasPermission` resolves `QUERY` from `req.scope` to load role policies. If the interceptor is
registered into `req.scope` and injects filters blanket-wide, **it filters its own permission
lookup.** Permission resolution must go through the unwrapped query, and filter injection must
be allow-listed per entity, never blanket.

### Both container keys

`QUERY` and `REMOTE_QUERY` are two independent `asValue` registrations of the same object. 130
core API files resolve `REMOTE_QUERY`. Wrap both or leak.

### Four entry points

`query` is a callable with `.graph`, `.index`, `.gql` bound on. All four need wrapping. `index()`
calls `this.graph` on the prototype — wrapping the exported `.graph` property does **not**
intercept it, so `.index` needs independent handling.

### Cache poisoning

`graph` and `index` carry `@Cached`, keyed off `args[0]`. Inject **outside** the decorated
method — wrap the outer function object, never patch `Query.prototype`. Injecting inside puts
two actors with different scopes on one cache entry.

### `traceRoute` is a single global slot

Semantically intended for tracing. OTEL sets it first (`registerInstrumentation` runs before
`loaders`), so chain `prev`. Any second plugin doing the same must also chain; nothing enforces
it. Undocumented for this use.

Guard the assignment for idempotence — HMR re-invokes `apiLoader.load()`, which would otherwise
stack wrappers on every reload. Duplicate-copy concerns do not apply: Medusa hard-fails on
duplicate core packages during workflow registration, so `@medusajs/*` is always deduped.

### The build artifact is what consumers load — and it goes stale silently

`package.json` exports the package root as `./.medusa/server/src/index.js`. **Nothing a consumer
resolves comes from `src/`.** `packages/complaints` resolves `medusa-plugin-access` through the
workspace symlink to `packages/access`, and therefore to `.medusa/server`.

Access's own jest suites compile `src/` directly, so they pass against code no consumer runs. This
has already produced a false result once: a full green run — including complaints' 72 tests and a
coverage measurement cited as proof the mechanism works — was recorded while `.medusa/server` was
90 minutes stale and still contained the fail-open `hasPermission`, case-sensitive matchers, and
the core-RBAC `policies` key. The security fixes existed only in the working tree.

**Rule: `yarn build` in `packages/access` before running any consumer's tests, and before trusting
any cross-package measurement.** Note access's own integration spec is itself mixed — it imports
utils from `../../src/utils` but workflows from `../../.medusa/server/...` — so it can pass with a
half-stale build.

### Workflows without `req.scope`

Scope shadowing propagates into workflows invoked as `wf(req.scope)`. Workflows launched with no
container fall back to the root container and are **unfiltered**. Audit that every route that
matters passes `req.scope`.

---

## 6. Existing defects to fix

| # | Item | Severity | Status |
|---|---|---|---|
| 1 | `POST /admin/access/roles` had no `policies` key — any authenticated admin could create roles | high | **done** |
| 2 | `parent_id` (validator) vs `parent_ids` (workflow) — inheritance was unreachable via API | high | **done** |
| 3 | `DELETE /admin/complaints/:id` unguarded — policy registered on `^/admin/complaints$`, cannot match | high | **done** |
| 4 | Permission resolution repeated per call — the cross-request cache was inert | high | **done — request-scoped memoization, see below** |
| 5 | Public `/content/*` — cache key omitted `fields`; fixed by rejecting `fields` at the validator | medium | **done** |
| 6 | `access-policies/index.ts` self-referential `export * from './index'` | low | **done** |
| 7 | `store` / `store_locale` declared twice | low | **done** |
| 8 | Role-parent cycle errors threw plain `Error` → 500 instead of 400 | low | **done** |
| 9 | `getAssignableRoles` paginated before filtering (wrong `count`) | low | **done** |

### Found later, during adversarial review — all fixed

| # | Item | Severity | Status |
|---|---|---|---|
| 10 | **Guard bypass via path casing.** Express sets neither `case sensitive routing` nor `strict routing`, so it dispatches `/admin/Complaints/abc` to the `/admin/complaints/:id` handler while our case-sensitive matchers missed it — bypassing both the policy check and `sealNamespace` | high | **done** |
| 11 | **Guard bypass via trailing slash.** `/admin/access/roles/` missed `/admin/access/roles`, silently re-opening defect #1 | high | **done** |
| 12 | **Wrong operation via trailing slash.** `/admin/complaints/` matched the `/*` subtree rule, so creating required `update` rather than `create` | medium | **done** |
| 13 | **HEAD unguarded.** Express dispatches HEAD to the GET handler; `guardResource` declared no HEAD, making it an existence oracle | medium | **done** |
| 14 | **`hasPermission` failed OPEN on an empty role set.** `accessGuard` compensated with its own length check, but direct callers did not | high | **done** |
| 15 | **Policies declared via core RBAC's `MiddlewareRoute.policies` field.** Predates both redesign commits. Enabling `MEDUSA_FF_RBAC` would have made core wrap our routes with `wrapWithPoliciesCheck`, which reads roles from JWT `app_metadata` we never write — 403 on every access route | medium | **done** |

10–13 are fixed by normalizing the request path (case-insensitive matchers, trailing/duplicate
slash collapse) and mapping HEAD→GET in `matchRoutePolicies`. 14 by failing closed on empty roles.
15 by renaming our declaration key to `accessPolicies` (`AccessMiddlewareRoute`), so core never
sees a `policies` key on our routes.

Two integration cases were added with #2, since inheritance had never been tested: role creation
with `parent_ids` resolving an inherited policy through `hasPermission`, and self-parenting
returning 400.

### #4 — resolved by request-scoped memoization

**What shipped.** `fetchSingleRolePolicies` memoizes the **in-flight promise** per
(request scope, role). The in-flight part matters: the response field filter calls
`hasPermission` once per entity path and those fire concurrently, so memoizing only on completion
would still let N identical queries start.

Memoization is **opt-in**, keyed on a marker (`Symbol.for('access.requestScope')`) that
`accessGuard` stamps on `req.scope`. `hasPermission` is also called with the ROOT container by
jobs, subscribers and CLI code; memoizing there would persist for the process lifetime — an
unbounded stale cache, the exact failure mode being avoided. Unmarked containers are never
memoized.

**Staleness window: zero.** The memo lives and dies with one request.

Tested: three concurrent `hasPermission` calls against a marked scope collapse to one
`query.graph`, and a later sequential call in the same request reuses it; an unmarked scope
issues two queries for two calls.

The cross-request `useCache` block remains **inert** and is left in place with its rationale. It
is not needed — the cost was intra-request fan-out, not repeated resolution across requests.

---

#### For the record: a short-TTL attempt was made first, reviewed, and reverted

An earlier attempt set `enable: true` with a 5s TTL. Adversarial review found it unsound.
**Its three premises were each false**, and they had been recorded in this document as fact —
correcting them here, because the same mistakes would otherwise be repeated if the cross-request
cache is ever revisited:

1. **"Nothing in the module emits mutation events."** Wrong. `MedusaService` decorates every
   generated method with `@EmitEvents` and installs a global MikroORM subscriber, so
   `AccessRole` / `AccessPolicy` / `AccessRolePolicy` / `AccessRoleParent` mutations **already**
   emit `access.access-role.created` and friends. **Zero service methods need overriding.**
2. **"Matching core's tag derivation is fragile."** It is four lines of deterministic string
   manipulation over names we control (`eventName.split('.').slice(-2).shift()` →
   `upperCaseFirst(toCamelCase(...))`), and unit-testable.
3. **"A TTL cannot fail silently."** `Number('')` is `0`, and node-cache treats a `0` TTL as
   **never expires**. A declared-but-empty `ACCESS_ROLE_CACHE_TTL` would have produced an
   unbounded cache, silently — the exact failure mode the TTL was chosen to avoid. A typo
   yielding `NaN` falls through to a 3600s default just as quietly.

The attempt also shipped two defects:

- **Tags were always empty.** `tags: Array.from(new Set(tags))` is an argument, evaluated before
  the callback that populates `tags` runs. The original code passed the array by reference, which
  `useCache` re-reads after the callback resolves — so the "dedupe improvement" broke working
  behaviour. Silent.
- **A production regression.** `providers: ['cache-memory']` only resolves when a config sets
  `in_memory.enable`. `apps/backend` configures Redis only, so the provider was unregistered
  there: no caching at all, plus error/warn logs on every check — and the field filter calls
  `hasPermission` once per entity path per response.

Reverted to inert. The caching module added to the access test app is retained (harmless, and
needed whenever this is taken up).

**Also learned:** the hardcoded `cache-memory` provider is load-bearing and undocumented. The
cached value is a `Map`, which `JSON.stringify`s to `{}` — on a Redis-backed hit, `policyAllows`
would call `.get()` on a plain object and throw, 500-ing every permission check.

#### If a cross-request cache is ever wanted on top

Not currently needed. If it is:

1. Cache a JSON-serializable shape (not a `Map` — it `JSON.stringify`s to `{}`, so a Redis-backed
   hit would call `.get()` on a plain object and 500 every permission check).
2. Drop the hardcoded `providers: ['cache-memory']` so the configured default is used, and so
   core's `clear({ tags })` reaches the same store.
3. Tag coarsely — `AccessRole:list:*`, `AccessPolicy:list:*`, `AccessRolePolicy:list:*`,
   `AccessRoleParent:list:*` — so the mutation events that **already fire** do the invalidating.
4. Validate any env-configurable TTL: reject non-finite/non-positive, clamp, log the effective
   value at boot.

Note: role *assignment* changes (revoking a user's role) are already immediate —
`accessGuard` resolves `access_roles.id` with a fresh uncached query per request. Only
policy/inheritance edits would ever be affected by a role→policies cache.

### Adjacent findings, not fixed

- **`AdminUpdateAccessRole` has no `policy_ids`**, but `updateAccessRolesWorkflow` reads
  `input.update.policy_ids`. Same dead-field class as #2. Not added, because
  `POST /admin/access/roles/:id/policies` already exists — exposing a second path is a design
  call, not a bug fix. Decide: expose it, or drop it from the workflow.
- **The list filter `parent_id`** in `AdminGetAccessRolesParamsFields` is also dead — `access_role`
  has no `parent_id` column; hierarchy lives in `access_role_parent`.
- **`GET /admin/access/roles/:id/policies` returns direct links only.** It filters
  `access_role_policy` by `role_id`, so the admin role-detail page does not show inherited
  policies. A UI gap that becomes visible now that inheritance is reachable.

---

## 7. Documentation

The README's usage examples encode the current path-matcher API and go stale the moment Phase 1
lands. Doc updates ship **with** the phase that changes the API, not after.

### `## Concepts`

- Add `export` to the operation list. Currently reads `read`, `create`, `update`, `delete`, `*`.
- Add **Scope** as a first-class concept alongside Policy and Role — `owner` as an alternative
  satisfier on a route, `sales_channel` as a constraint on a role. This is the biggest conceptual
  addition and it needs its own subsection, not a footnote.

### `## Guarding your own API routes` — largest rewrite

Currently teaches `definePolicies(generateResourcePolicies([...]))` plus one `requirePolicies`
call per route+method. Replace with:

- `guardResource({ resource, prefix })` as the default — one call, whole surface
- `requirePolicies` demoted to the escape hatch for sub-resources needing *stricter* treatment,
  with the coarse→fine tightening rule stated
- `sealNamespace` with the segment-aware note and the "binding on anyone who extends your prefix"
  contract
- **The floor-defeats-OR constraint** (§1) as an explicit gotcha. This will bite someone and the
  symptom looks like a scope bug.

### `### Optional dependency (for plugin authors)`

The try/catch `require` pattern stays valid; the body changes to `guardResource`. Keep the
example — it's the pattern every sibling plugin copies.

### New — `## Scoping access to rows`

Doesn't exist yet. Needs:

- declaring `owner` on a route, and what it means on list vs single-resource routes
- `defineOwnership({ resource, filter })` for plugin-owned resources
- `sales_channel` constraint on a role
- assigning roles to **customer groups**, and that customers resolve roles through groups
- the stated limit: root-scoped only, no nested row filtering (§4)

### New — `## Enforcing outside HTTP`

`hasPermission` is currently a footnote under "Checking a permission in a route handler". Promote
it: it is the answer for MCP tool dispatch, workflow steps, and any route that takes a resource
name as a parameter and therefore cannot be gated by path. The MCP `query` tool is the worked
example.

### `## Features` and `## Notes`

Features list still claims path-declared route guards as the mechanism. Notes should gain the
dependency-line statement from §4 — we build on the query layer, never on `@medusajs/rbac`.

### Elsewhere in the monorepo

`complaints` is the POC and its own README/comments reference the old shape. Sweep sibling
plugins for copied `requirePolicies` blocks once Phase 1 lands.

---

## 8. Sequencing

| phase | status |
|---|---|
| 0 — defects | **done** (all of 1–15, §6) |
| 1 — declaration | **done** |
| 2 — binding | **done** |
| 3 — scope, gate half | **deferred — found unsound as designed, see below** |
| 4 — scope, filter half | deferred (depends on 3) |
| 5 — field pruning | not started |
| 6 — admin UI restructure | not started |
| §7 documentation | **not started** — README still describes the pre-Phase-1 API |

**Phase 0 — defects. DONE.** Items 1–9 above, plus 10–15 found during adversarial review.

**Phase 1 — declaration. DONE.** `guardResource`, segment-aware `sealNamespace`, boot-time
coverage report. Validated against `complaints` as the POC: three `guardResource` calls replaced
six hand-written declarations and covered 21 more routes (398 → 419 of 638 in `apps/backend`),
with zero `/admin/complaint*` routes left undeclared, then sealed.

*Note:* the coverage report needs to know which routes exist, and `ApiLoader.traceRoute` is the
only clean source (it fires for every route at registration with `{ route, method }`). So the
traceRoute hook gets installed in Phase 1 for route discovery, and Phase 2 extends the same hook
to read handler identity. Same seam, two increments.

*Testing note — RESOLVED.* This originally recorded that no test app had a consumer plugin
installed, so `require('medusa-plugin-access')` threw in complaints and its 72 tests ran entirely
ungated — proving the soft-dependency contract but nothing about the guard.

`packages/complaints/medusa-config.ts` now installs `medusa-plugin-access`, so the registration
path (`definePolicies` → `guardResource` → `sealNamespace` from a consuming plugin) executes under
test for the first time. Its coverage report reads `405/431 admin routes declared`. Granting the
test admin the seeded super-admin role was required to make the suite pass, which is itself
evidence the guard enforces. The 401-without-token cases still pass, confirming Medusa's auth
still runs ahead of the guard.

Enforcement behaviour is covered in access's own spec: sealing (404 unsealed → 403 sealed, sibling
prefixes untouched) and AND-layering with a partially-granted, non-super admin.

**Phase 2 — binding. DONE.** `withPolicies` + handler identity via the Phase 1 `traceRoute` hook,
plus a boot-time drift report.

*Correction to the original plan.* This phase was written as "retire `compileMatcher` and the
pinned `core-route-policies.ts` in favour of matchers from the running app." That is not
achievable: `traceRoute` yields authoritative **matchers**, but nothing at runtime yields
**policies** — core declares those on middleware descriptors, which `traceRoute` never sees (it
fires for routes only). The resource→operation mapping still has to come from the generated file.

What is achievable, and what shipped instead: `withPolicies` removes hand-written matchers for
routes we own (the matcher comes from Medusa's own registration), and `getStaleGuards()` reports
declarations matching no registered route — which is the actual failure mode of a pinned file.
`compileMatcher` stays; `guardResource` emits `/prefix/*` wildcards that inherently need pattern
matching.

*Provenance matters in the drift report.* `guardResource` emits a complete CRUD surface on
purpose, so its unmatched entries are protective, not rotted. Reporting them made the check noisy
enough to ignore, so guards carry a `source` and only hand-written ones are flagged. Against
`apps/backend` this removed the `guardResource` noise and left only hand-written declarations —
dominated by the `/admin/rbac/*` leftovers from the fork origin (this plugin serves
`/admin/access/**`, and core's rbac routes are flag-disabled so never register), plus a handful of
core routes that no longer exist and two wildcards matching nothing.

*Counts deliberately omitted.* Earlier drafts cited specific totals that disagreed with each other
and with the code. Any number here is a runtime observation against one app at one commit — run
the report rather than trusting a figure in this document.

**Phase 3 — scope, gate half. DEFERRED.** Two independent adversarial reviews found the model in
§1 unsound as designed. Deferring is not a scheduling call — the design needs revision before it
is worth building.

**Claims in §1 that are false against the code:**

1. *"Single-resource routes 404."* **64 of 72 core admin DELETE routes never call `query.graph`**
   (`DELETE /admin/products/:id` runs `deleteProductsWorkflow(ids)` with no fetch). A scope filter
   never runs, and the row is deleted.
2. *"A filter cannot be forgotten … never a post-hoc row test."* §1's own worked example
   (`DELETE /store/reviews/:id`) is implemented as a module-service `retrieve` plus
   `if (customer_id === actorId)` plus a 403 — precisely the pattern the design cites Vendure for
   as unsafe, already in the tree and working.
3. *"They compose where needed … filters OR together."* `(grant AND channel) OR owner` puts the
   owner branch **outside** the channel constraint, so `owner` is a `sales_channel` bypass.
4. *"The operation set is closed."* `definePolicies` appends any operation to a global registry,
   and `default-policy-operations.ts` snapshots that global at import time — so what
   `generateResourcePolicies` emits is load-order dependent. (`export` has since been added to
   the default set; the appending behaviour remains.)

**Structural problems, independent of those claims:**

- **OR is not expressible.** `PermissionAction` is `{ resource, operation }` with no grouping, and
  `matchRoutePolicies` returns a flat array that `hasPermission` ANDs. `operation: string[]`
  already means AND (four core declarations rely on it), so it cannot be reused for alternation.
  Adding `owner`-OR requires changing the return shape consumed by `requirePolicies`,
  `registerRoutePolicies`, `withPolicies`, and every consumer's declaration block.
- **A route can carry two resources with different owners.** `POST /admin/complaints/:id/activities`
  requires `complaint:update` (subtree floor) **and** `complaint_activity:update`. "Ownership"
  means `complaint.customer_id` on one and `complaint_activity.user_id` — the authoring admin — on
  the other. One scope name, two predicates, one flat list, no disambiguation.
- **Gate-only `owner` is worse than no `owner`.** Phase 3 as scoped delivers the gate without the
  filter, so an `OR owner` route would let every authenticated actor past and narrow nothing —
  shipping the exact Vendure failure mode the design exists to avoid.
- **A column predicate cannot express most ownership here.** `form_submission` has no owner column
  at all; `complaint_document`/`complaint_note` are owned only through the parent complaint;
  `review.customer_id` is nullable with `author_email` alongside for imported reviews.
- **Union vs intersection is unspecified** for a customer in multiple groups. Grants must union;
  an AND-scope must intersect. The design uses one word ("role") for both axes.
- **The `guardResource`-floor-defeats-OR mitigation is advisory only.** Nothing enforces it,
  `getRouteCoverage` reports such a route as covered, `getStaleGuards` excludes `guardResource`
  entries, and a super admin never sees the failure.

**Before revisiting, settle:** the grouping structure for `PermissionAction`; whether `owner`
binds to a resource rather than a route; whether `owner` escapes the channel constraint (default:
it should not); union-vs-intersection; and an honest enumeration of which handlers a filter can
actually reach.

**Phase 4 — scope, filter half.** Deferred with Phase 3. Query interceptor in `req.scope`; all
hazards in §5 apply, plus: the callable query accepts three argument shapes (`{entity}`,
`{entryPoint, variables}`, `{__value}` — the last being what all `REMOTE_QUERY` call sites
produce), and `.gql()` takes a GraphQL string that cannot be filtered without parsing.
`.index()` also deletes and replaces `queryOptions.filters` before re-entering `.graph` on the
prototype.

**Phase 5 — field pruning.** Extend the Phase 4 interceptor to prune `queryOptions.fields`.
Single layer — `queryConfig.disallowed` is off limits along with the rest of the core field
filters. Post-query `res.json` pass retained as the final attempt. Requires the clean-room
path→entity resolver (see §4 provenance note). No core flags, no core-RBAC dependency.

**Docs are not a phase — and this rule has already been broken.** §7 says each phase carries its
own README changes and that "a phase is not done until its examples are true." Phases 1 and 2 have
shipped and **the README has not been touched**, so it still teaches the per-route
`requirePolicies` API as the primary mechanism and does not mention `guardResource`,
`sealNamespace`, `withPolicies`, the coverage report, or `export`. That is now the largest
outstanding gap in this document.

**Phase 6 — admin UI restructure.** Separate plan, after the backend work. Target is a single
root path `/settings/access`, replacing today's two top-level entries (`/settings/access-roles`,
`/settings/access-policies`). **Goal is to declutter the settings sidebar** — one entry for the
plugin, with roles and policies reached from inside it.

Notes already established, so the plan doesn't rediscover them:

- **The dashboard only renders top-level settings menu items.** `populateMenus` returns early for
  any settings path deeper than two segments: *"Nested settings menu item … can't be added to the
  sidebar. Only top-level settings items are allowed."* `/settings/access/roles` therefore stays
  out of the sidebar by default, which is exactly the intent — sub-navigation lives inside the
  page.
- **A plugin's admin extensions are only discovered via an exact `"./admin"` export key** in
  `package.json` — `!!pkgJSON.contents.exports?.["./admin"]`. A `"./*"` wildcard does not satisfy
  it. Missing this key silently disables the entire admin surface; it is what hid these routes.
- **The UI never calls `/admin/access/me/permissions`.** The type exists but no hook consumes it,
  so every admin sees the settings pages and simply 403s on fetch. Worth fixing in the same pass.
- **The UI never calls the `/assignable` endpoints.** `policy-picker` uses the full catalogue, so
  it offers policies the actor cannot grant; the failure surfaces as a 403 on save.
- **`GET /admin/access/roles/:id/policies` returns direct links only**, so inherited policies do
  not appear on the role detail page — newly visible now that inheritance works (§6).
- No UI exists for role parents at all.

---

## 9. Out of scope

- Filtering fields or rows for **presentation**. Medusa's view configurations own that and are
  actively expanding. "Reduce noise in this list" is never the justification for a feature here.
- Field-level (scalar) access control.
- Nested row filtering. Would require a core change we are not pursuing (see
  [docs/UPSTREAM - access.md](../../docs/UPSTREAM%20-%20access.md), retained for reference only).
- Admin cross-channel row scoping as a hard boundary.
- The 14 packages with no access declarations yet. Known, tracked separately, not a design input.

---

## 10. TODO

- **Prune stale entries from `core-route-policies.ts` via the generator.** The Phase 2 drift
  report flags declarations matching no registered route — mostly `/admin/rbac/*` leftovers from
  the fork origin, plus `DELETE /admin/claims/:id`, `DELETE /admin/exchanges/:id`,
  `POST /admin/inventory-items/batch`, and the `/admin/product-variants/*` and
  `/admin/tax-providers/*` wildcards. The file is generated, so hand-edits are lost on the next
  run: the fix belongs in `scripts/gen-core-route-policies.cjs`. Harmless today (a guard for a
  path that does not exist never fires), so this is hygiene, not a defect.
- **README rewrite for Phases 1 and 2** — the largest outstanding gap. Per §7 the docs should have
  shipped with those phases; they did not. The README still teaches per-route `requirePolicies`
  and mentions none of `guardResource`, `sealNamespace`, `withPolicies`, the coverage report, or
  `export`.
- **Close the operation set for real.** `export` has been added to `defaultOperations`, but
  `definePolicies` still appends any operation a caller passes to the global registry, and
  `default-policy-operations.ts` snapshots that global at import time — so what
  `generateResourcePolicies` emits is load-order dependent. "Closed" means plugins cannot define
  operations ad hoc; that is not enforced yet.
- **Export routes under a resource prefix inherit the subtree operation.**
  `/admin/complaints/pdf-export` picks up `complaint:update` from the `/*` floor rather than
  `complaint:export` — stricter than intended, not wrong. Resolving it means either moving export
  routes outside the prefix or teaching `guardResource` about them.
- **`AdminUpdateAccessRole.policy_ids`** — the workflow reads it, the validator does not accept
  it. Expose it, or drop it from the workflow (§6).
- **Dead list filter `parent_id`** on `AdminGetAccessRolesParamsFields` — `access_role` has no
  such column (§6).
- **Inherited policies are invisible in the admin UI** — `GET /admin/access/roles/:id/policies`
  returns direct links only. Newly relevant now that inheritance is reachable (§6, Phase 6).
