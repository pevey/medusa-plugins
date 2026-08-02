# medusa-plugin-access — redesign spec

Status: draft for review. Derived from a design session covering `medusa-permissions`
(tax1driver), Medusa core's `@medusajs/rbac`, and Vendure's permission system, plus four
feasibility probes against Medusa 2.18.0.

Everything in "Verified constraints" was checked against the shipped 2.18.0 build, not inferred.

---

## 1. Model

### Grant

A grant is `(resource, operation)`. Operations are a **closed, universally-applicable set**:

```
read | create | update | delete | export
```

The set is closed deliberately. Domain verbs (`approve`, `publish`, `sync`) are not operations —
they are `update` on the resource. `export` earns inclusion because it applies to essentially
every resource and carries a distinct risk profile (bulk extraction), which is the test.

Grants are what get assigned to roles and rendered in the admin UI. The policy matrix stays
`resources × 5 operations`.

### Scope

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

### Roles

- Roles hold grants. Multiple roles per actor; `hasPermission` unions across them.
- **Inheritance stays.** Fix the `parent_id` / `parent_ids` mismatch that currently makes it
  unreachable via API and UI.
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
| `/admin/complaints/*` | GET | `complaint:read` |
| `/admin/complaints/*` | POST | `complaint:update` |
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

Three layers, each with a different reach.

### Layer 1 — Gate (handler)

"Does this actor hold `(resource, operation)` at all?" Wrapped at registration via `traceRoute`.
403 on failure. This is what exists today, relocated from path-matching to handler-binding.

### Layer 2 — Row filter (query interceptor)

"Which rows?" Injected into `query.graph` / `query.index`, below the route, so it applies to
every caller — routes, MCP tools, workflow steps invoked with `req.scope`.

Seam: a global middleware registers a wrapped query into `req.scope`. Verified supported —
`query` is registered with `asValue` as a plain callable with `.graph`/`.index`/`.gql` bound on,
and Awilix scope registration shadows the parent.

### Layer 3 — Field pruning

Same interceptor as Layer 2, which sees `queryOptions.fields` before normalization. Prune paths
that reach entities the actor cannot read. Post-query `res.json` pass retained as the final
attempt, covering only responses not built from `query.graph`. See §4.

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
| 4 | `useCache` called without `enable` — permission cache never engages | high | **deferred, see below** |
| 5 | Public `/content/*` — cache key omitted `fields`; fixed by rejecting `fields` at the validator | medium | **done** |
| 6 | `access-policies/index.ts` self-referential `export * from './index'` | low | **done** |
| 7 | `store` / `store_locale` declared twice | low | **done** |
| 8 | Role-parent cycle errors threw plain `Error` → 500 instead of 400 | low | **done** |
| 9 | `getAssignableRoles` paginated before filtering (wrong `count`) | low | **done** |

Two integration cases were added with #2, since inheritance had never been tested: role creation
with `parent_ids` resolving an inherited policy through `hasPermission`, and self-parenting
returning 400.

### #4 is larger than it looks — do not half-fix

Adding `enable: true` alone would be a **security regression**. Two further things are required:

1. **Tag format mismatch.** The caching strategy derives tags as
   `` `${upperCaseFirst(toCamelCase(entityType))}:${id}` `` from event names — i.e.
   `AccessRole:<id>`. Our hand-built tags are `access_role:<id>`. They would never match, so
   entries would never be cleared.
2. **No events are emitted.** Auto-invalidation fires from an event-bus subscription on `*`.
   Nothing in the access module emits on role/policy/role-policy/role-parent mutation (only the
   bootstrap event), so no invalidation would occur at all.

With a 7-day TTL and neither fixed, a revoked role would stay effective for a week. The complete
fix is: rename tags, emit mutation events, shorten the TTL, enable, and add a test proving a role
change invalidates. Its own task, with its own verification.

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

**Phase 0 — defects.** Items 1–5 above. Independent of everything else.

**Phase 1 — declaration.** `guardResource`, segment-aware `sealNamespace`, boot-time coverage
report. Validate against `complaints` as the POC: coverage report before → apply `guardResource`
→ report goes to zero → seal. Repeatable check for other packages later.

*Note:* the coverage report needs to know which routes exist, and `ApiLoader.traceRoute` is the
only clean source (it fires for every route at registration with `{ route, method }`). So the
traceRoute hook gets installed in Phase 1 for route discovery, and Phase 2 extends the same hook
to read handler identity. Same seam, two increments.

**Phase 2 — binding.** `withPolicies` + handler identity via the Phase 1 `traceRoute` hook.
Retire `compileMatcher` and the pinned `core-route-policies.ts` in favour of matchers from the
running app.

**Phase 3 — scope, gate half.** Grant/scope model, `owner` + `sales_channel`,
`defineOwnership`. Gate enforcement only.

> **Blocked on defect #4.** Customer actors resolve roles through groups
> (customer → groups → roles → channels), which is two or three graph hops on every storefront
> request against a cache that does not currently engage. #4 must be fixed — properly, per §6 —
> before this phase ships.

**Phase 4 — scope, filter half.** Query interceptor in `req.scope`. All hazards in §5 apply.
Affiliate portal is the natural first consumer — root-scoped, our own routes.

**Phase 5 — field pruning.** Extend the Phase 4 interceptor to prune `queryOptions.fields`.
Single layer — `queryConfig.disallowed` is off limits along with the rest of the core field
filters. Post-query `res.json` pass retained as the final attempt. Requires the clean-room
path→entity resolver (see §4 provenance note). No core flags, no core-RBAC dependency.

**Docs are not a phase.** Each phase carries its own README changes per §7 — Phase 1 rewrites
"Guarding your own API routes", Phase 3 adds "Scoping access to rows" and the Concepts additions,
and `hasPermission` gets promoted whenever MCP tool gating lands. A phase is not done until its
examples are true.

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
  [UPSTREAM.md](./UPSTREAM.md), retained for reference only).
- Admin cross-channel row scoping as a hard boundary.
- The 14 packages with no access declarations yet. Known, tracked separately, not a design input.
