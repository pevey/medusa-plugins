# medusa-plugin-access

A plugin to add access control based on defined roles and access policies to the Medusa v2 admin.

[Documentation](https://pevey.com/medusa-plugin-access)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- **Roles → policies → users.** A _policy_ is a fine-grained `resource:operation` grant (e.g. `product:read`); a _role_ is a named bundle of policies; admin users are assigned roles.
- **Role inheritance** — a role can inherit all of a parent role's policies.
- **Server-side enforcement** on every request the app serves — a global `/*` guard returns `403` when the caller's roles don't grant a route's required policies. Hiding UI is not the security boundary; the API is.
- **Declarative route guards** — protect any route (Medusa's core admin routes, your own, another plugin's, or a `/store` route) by declaring the policies it requires.
- **Bundled core policies** for Medusa's built-in resources (products, orders, customers, inventory, pricing, promotions, and more), plus a one-liner to declare policies for your own resources.
- **`GET /admin/access/me/permissions`** so admin widgets/pages can show or hide UI based on the current user's permissions.
- **Admin Settings UI** to manage roles, review policies, and assign roles to users.
- **Seeded Super Admin role** (`*:*`) with automatic first-install lockout protection.
- Runs entirely on your Postgres database — no external service.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-access
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

After installing the plugin, you must run Medusa's migration tool to create the plugin's database tables.

```bash
yarn medusa db:migrate
```

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-access',
			options: {}
		}
		// ... other plugins
	]
})
```

Registering the plugin installs the Access module, the admin Settings UI, the global `/*` enforcement guard, and the role/policy API routes. The guard itself runs on every request; the bundled core policy map only declares Medusa's admin routes, so `/admin` is what is guarded out of the box. Declaring `requirePolicies` or `sealNamespace` on any other prefix (e.g. `/store`) makes the guard enforce there too.

The one option is `accessNamespace`, configuring the top-level `/access` introspection surface (see [The `/access` namespace](#the-access-namespace)):

```ts
{
	resolve: 'medusa-plugin-access',
	options: {
		accessNamespace: {
			// Actor types allowed on /access routes, additive to the "user" default.
			actorTypes: ['customer'],
			// CORS origins for /access; defaults to the union of adminCors and storeCors.
			cors: 'https://portal.example.com'
		}
	}
}
```

### The `/access` namespace

`GET /access/me/permissions` answers the same contract as `GET /admin/access/me/permissions` — the authenticated actor's own effective permissions — but on a top-level namespace that is not hard-locked to the `user` actor type the way `/admin/*` is. That is what lets a POS client, an affiliate portal, or a B2B customer portal ask "what can I do" for conditional UI. The route is authenticated (bearer or session) but not authorization-gated: it is self-referential introspection, and an actor type with no role resolution simply reports no permissions.

By default only `user` is allowed; opt other actor types in via the `accessNamespace` option above, or programmatically — a plugin that registers a custom actor type can pair the two calls:

```ts
import { configureAccessNamespace, registerActorResolver } from 'medusa-plugin-access'

registerActorResolver({ actorType: 'affiliate', /* ... */ })
configureAccessNamespace({ actorTypes: ['affiliate'] })
```

## Important: installing this plugin gates your entire admin

Enforcement is always on once the module is loaded. The plugin ships a pinned map of Medusa's core admin routes to the policies they require, so after install a user can only reach an admin route if one of their roles grants the matching policy.

To avoid locking yourself out, on the **first** boot after install the plugin links **every existing user** to the seeded **Super Admin** role (which holds the wildcard policy `*:*`). This runs once — the moment any user↔role link exists, it never runs again.

Consequences to plan for:

- **Existing users keep full access** (they become Super Admins) until you give them narrower roles.
- **Users created _after_ that first boot have no roles**, and will be denied on guarded routes until you assign them a role.
- Give at least one trusted account the Super Admin role (or a role with the policies needed to manage access) before you start restricting others.

### Upgrading tightens routes too, not only installing

Route coverage grows between versions, and a route that gains a declaration starts denying roles that never held the new grant. Super Admins (`*:*`) are unaffected; narrower roles are not.

Coverage currently reaches beyond what Medusa declares for itself: 35 state-changing admin routes across `view`, `layout`, `property_label`, `product`, `order`, `product_variant`, `price_list`, `inventory_item`, `tax_rate`, `search_index`, `workflow_execution` and `rbac_role` are gated here that core left either undeclared or at a read-only floor. `POST /admin/products/:id` is the clearest example: without this it required only `product:read`, so anyone who could view a product could edit it.

After upgrading, check the boot-time **route coverage** report and grant the new policies to any non-wildcard role that needs them — a role that could previously save a dashboard view or layout now needs `view:update` / `layout:update` explicitly.

## Concepts

**Policy.** A single grant, identified by the string `resource:operation` — e.g. `product:read`, `order:update`, `access_role:delete`. The operation set is closed: `read`, `create`, `update`, `delete`, `export`, and the wildcard `*`. Domain verbs (approve, publish, cancel) are modelled as `update` — a policy declared with anything else is discarded and reported at boot rather than registered, so a typo cannot mint a grant nobody can hold.

**Wildcards.** `*` matches any resource or operation. `product:*` grants every operation on products; `*:read` grants read on everything; `*:*` grants everything (this is what the Super Admin role holds).

**Role.** A named set of policies. Roles can have a parent role and inherit its policies (inheritance is transitive and cycle-protected).

**Policies are declared in code, not in the UI.** The set of assignable policies is defined in code (see [Guarding your own API routes](#guarding-your-own-api-routes)) and synced to the database on every boot. The Policies settings page is therefore read-only, and a policy created directly in the database that has no matching code declaration is removed on the next boot.

**Scope.** A named, per-resource restriction attached to a granted policy (e.g. `customer:delete@own`), describing the subset of rows the grant covers. A per-request interceptor narrows every `query.graph` call against that resource's root to the scope's filter; an unscoped grant is unaffected and behaves exactly as before. See [Scoping access to rows](#scoping-access-to-rows).

## Managing roles and access (admin UI)

The plugin adds two pages under **Settings**:

- **Settings → Roles** — create and delete roles, edit a role's details, manage the policies attached to a role, and assign/remove users on a role.
- **Settings → Policies** — a read-only reference of every policy currently registered in code.

It also adds a widget to the **user detail** page (under the user's info) for assigning and removing that user's roles directly.

A user can only assign roles whose policies they themselves hold — you cannot grant access you don't have.

## Guarding your own API routes

The core resources ship with policies already. To protect **your own** admin routes, declare the resource's policies once, then declare the routes — in your project's or plugin's `src/api/middlewares.ts`.

### `guardResource`: the default

One call covers a resource's whole CRUD surface, collection and subtree:

```ts
import { defineMiddlewares } from '@medusajs/framework/http'
import { definePolicies, generateResourcePolicies, guardResource } from 'medusa-plugin-access'

// Register the "content" resource's policies (content:read / :create / :update /
// :delete / :export) so they become assignable to roles and appear in
// /admin/access/me/permissions.
definePolicies(generateResourcePolicies(['content']))

guardResource({ resource: 'content', prefix: '/admin/content' })

export default defineMiddlewares({ routes: [] })
```

That emits, from one call:

| request                                | requires         |
| -------------------------------------- | ---------------- |
| `GET /admin/content`                   | `content:read`   |
| `POST /admin/content`                  | `content:create` |
| `PUT`/`PATCH /admin/content`           | `content:update` |
| `DELETE /admin/content`                | `content:delete` |
| `GET /admin/content/**`                | `content:read`   |
| `POST`/`PUT`/`PATCH /admin/content/**` | `content:update` |
| `DELETE /admin/content/**`             | `content:delete` |

The subtree floor is the point. Matchers are anchored, so a declaration on `/admin/content/:id` would not cover `/admin/content/:id/notes` — sub-resources you forget about would fail open. `guardResource` closes that by default.

`POST` on the subtree maps to `update`, not `create`: `POST /admin/content/:id/notes` creates a note but is modifying the content item. `create` is reserved for `POST /admin/content` — creating the resource itself.

### `requirePolicies`: the stricter-sub-resource escape hatch

Use it to make one path **stricter** than the floor:

```ts
// Both resources, or the stricter declaration below requires a grant no role can
// hold — which denies everyone but a `*:*` holder and presents as "permissions
// are broken on this route" rather than as a missing declaration.
definePolicies(generateResourcePolicies(['content', 'content_publish']))

guardResource({ resource: 'content', prefix: '/admin/content' })

// Publishing needs its own grant, on top of the content:update floor.
requirePolicies({
	method: ['POST'],
	matcher: '/admin/content/:id/publish',
	policies: [{ resource: 'content_publish', operation: 'update' }]
})
```

`matchRoutePolicies` returns the union of every matching declaration and **all** of them must pass, so layering is AND. That makes coarse→fine tightening safe and fine→coarse impossible: you can add requirements to a path, never remove them. Do not reach for `requirePolicies` to _loosen_ a path — it cannot.

- `matcher` is an Express-style path against the full URL. `:param` matches a single segment, `*` matches the rest.
- `method` defaults to every method when omitted.
- Multiple policies on one route are ANDed.

### Export endpoints

An export route under a resource prefix would inherit the subtree floor — `POST /admin/content/csv-export` would demand `content:update`. Name it in `exports` to require `content:export` instead:

```ts
guardResource({ resource: 'content', prefix: '/admin/content', exports: ['csv-export'] })
```

The listed paths are carved out of the floor rather than layered on top, so `content:export` alone is sufficient. An explicit list, not a naming convention — a convention would guess at intent. Exclusions are segment-bounded, so `csv-export` does not also carve out `csv-export-log`.

### Co-located declarations

If you already build a `MiddlewareRoute[]`, declare the policy next to the route instead:

```ts
import { AccessMiddlewareRoute, registerRoutePolicies } from 'medusa-plugin-access'

const routes: AccessMiddlewareRoute[] = [
	{
		method: ['POST'],
		matcher: '/admin/content/:id',
		middlewares: [validateAndTransformBody(UpdateContent)],
		accessPolicies: [{ resource: 'content', operation: 'update' }],
		// Opt a scoped mutation in; see "Scoping access to rows".
		assertsScope: true
	}
]

registerRoutePolicies(routes)
export default defineMiddlewares({ routes })
```

This is right when routes need per-route operations a single `guardResource` call cannot express — which is why this plugin's own admin routes use it. Note the key is `accessPolicies`, deliberately **not** core's `policies`: that one belongs to core RBAC, whose checker reads roles from the JWT rather than from links, and would 403 every one of these routes if core's `rbac` flag were ever enabled.

### `sealNamespace`: opt a prefix into fail-closed

```ts
sealNamespace('/admin/content')
```

Undeclared routes pass by default (see [Fail-open is the default](#fail-open-is-the-default)). Sealing reverses that for a prefix you own: any request under it with no matching declaration is denied.

Two things to know. Sealing matches on segment boundaries, so `/admin/content` seals `/admin/content/x` but not `/admin/contentious`. And it is **binding on anyone who later extends your prefix** — another plugin adding `/admin/content/import` gets a 403 until it declares a policy. Seal namespaces you own, not ones you share. `sealNamespace('/')` is rejected outright, and `/auth` can never be sealed.

## Fail-open is the default

A route that declares nothing is left entirely alone: not gated, not filtered, not authenticated by this plugin. Installing access next to an access-unaware third-party plugin does not change that plugin's behaviour.

This is deliberate. A framework that gated everything it did not recognise would break every plugin that has not adopted it. `sealNamespace` is how you opt a prefix out of it, and declaring routes is how you opt individual routes out.

The one thing the guard does on an undeclared route is mark the request scope for memoized role resolution, so an access-aware caller further down (a workflow step, a direct `hasPermission`) resolves each role once rather than once per call. Nothing about the request or response changes.

### Optional dependency (for plugin authors)

If you're writing a plugin that should work whether or not `medusa-plugin-access` is installed, require it lazily and no-op when it's absent, so your routes stay ungated on stores that don't use access control:

```ts
try {
	const { definePolicies, generateResourcePolicies, guardResource, sealNamespace } = require('medusa-plugin-access') as typeof import('medusa-plugin-access')

	definePolicies(generateResourcePolicies(['complaint']))
	guardResource({ resource: 'complaint', prefix: '/admin/complaints' })
	sealNamespace('/admin/complaints')
} catch {
	// medusa-plugin-access is not installed — routes remain ungated.
}
```

Declare `medusa-plugin-access` as an optional peer dependency in this case.

### What the package exports

From the root (`medusa-plugin-access`), server-side only — these touch global registries and the Medusa container, so they must not reach an admin bundle:

| | |
| --- | --- |
| Declaring | `definePolicies`, `generateResourcePolicies`, `guardResource`, `requirePolicies`, `registerRoutePolicies`, `sealNamespace` |
| Deciding | `authorize`, `hasPermission`, `resolvePermissions`, `canGrantScope` |
| Scoping | `defineScope`, `getScope`, `hasScope`, `assertScope`, `resolveUnscopedQuery` / `ACCESS_UNSCOPED_QUERY` |
| Actors | `registerActorResolver`, `resolveActorRoles` |
| Reports | `getRouteCoverage`, `getStaleGuards`, `listDiscardedPolicies`, `getUnregisteredGuardResources` — the same data the boot reports print, if you would rather assert on it in your own tests or ship it to a dashboard |
| Restricted fields | `declareRestrictedFields` — also available from the dedicated stable entry point `medusa-plugin-access/field-restrictions`, which other plugins should prefer for optional imports |

`medusa-plugin-access/workflows` is a separate entry point exporting the role and policy workflows (`createAccessRolesWorkflow`, `assignUserRolesWorkflow`, `getAssignableRolesWorkflow`, and the rest). Use it when you need role management inside your own workflow rather than over HTTP; the assignability rules apply there too, since they live in the workflow steps.

**Removed in 0.2.0:** `withPolicies`, `discoverPoliciesFromDir`, and the route-binding `policiesLoader`. Handler-attached declarations and directory scanning are both gone — declare routes with `guardResource`, `requirePolicies`, or the co-located `accessPolicies` key, and register policies with an explicit `definePolicies` call.

## Restricted fields

Medusa documents `http.restrictedFields` as hiding fields from store responses, but as of Medusa 2.18 core computes the restriction and then discards it unless the undocumented `MEDUSA_FF_RBAC_FILTER_FIELDS` feature flag is enabled. This plugin enforces it for real — no flag needed — and generalizes it beyond `/store`.

Enforcement is **silent**: a restricted field is stripped from responses at any depth below the response envelope, making it byte-indistinguishable from a field that does not exist (which core answers with a 200 and the field silently absent). There is deliberately no error response — an error would be the only signal in the system that confirms a field exists and is sensitive, which is exactly what a probing client wants to learn. Explicitly requesting a restricted field via `?fields=` is instead recorded in the operator log (`restricted_field_probe`, at debug). Sorting by a restricted field is neutralized by rewriting the `order` parameter to an unorderable field, so the response is whatever core answers for any unknown order field.

Sources, union-merged per request:

- `http.restrictedFields.store` in `medusa-config.ts` (including Medusa's own `["order", "orders"]` default) — enforced on `/store` as the core docs describe.
- `declareRestrictedFields({ prefix, fields })` — from your own code or other plugins. `prefix` is matched on segment boundaries and is not limited to `/store`: a plugin adding a public `/content` surface can keep `created_by` out of it while `/admin` sees everything. `fields` are single segments (`customer_tags`, not `customer.customer_tags`), matched against any position in a field path — the same semantics as core's config.

```ts
import { declareRestrictedFields } from 'medusa-plugin-access/field-restrictions'

declareRestrictedFields({ prefix: '/content', fields: ['created_by', 'updated_at'] })
```

For plugin authors, `medusa-plugin-access/field-restrictions` is a deliberately tiny, stable entry point: import it lazily from a module loader (where your plugin's options are available) and no-op when access is absent, the same pattern as [above](#optional-dependency-for-plugin-authors). `medusa-plugin-customer-tags`, `medusa-plugin-order-notes`, and `medusa-plugin-complaints` do exactly this to keep their relations admin-only by default.

Unlike route gating, this applies to **undeclared routes too** — it enforces configuration you or an installed plugin wrote, not route policies, so the fail-open contract above does not extend to it. Note it is a disclosure control, not a fetch control: the data is still queried and then stripped from the response. Response envelopes are respected — `/store/orders/:id` still answers `{ order: … }` with `orders` restricted; the restriction governs what can be reached *through* other entities.

## Boot-time reports

Three reports run on application start. Two are silent when there is nothing to say; route coverage always logs its one-line summary per declared prefix.

**Route coverage** lists the routes under each declared prefix that carry no policy declaration — the routes `sealNamespace` would start denying. Run it before sealing to see what sealing would break. It also reports the inverse, _drift_: hand-written declarations matching no registered route, which is what a renamed or removed route leaves behind. `guardResource` output and the pinned core-route map are excluded from drift, since both are deliberately broader than any one version's route set.

**Discarded policies** lists policies refused registration, along with every route whose declaration required the discarded grant. A policy is discarded for using an operation outside the closed set, or for missing `name`, `resource` or `operation` — neither throws, because `definePolicies` runs at module-load time and a typo in somebody else's plugin should not take your application down at boot. This matters more than it looks: a discarded policy is a grant no role can hold, so a route requiring it denies everyone but a `*:*` holder — which presents as "permissions are broken on this route" rather than as "someone typed `updte`".

**Unregistered resources** lists resources a route declaration requires that no `definePolicies` call ever registered. Same outcome as a discarded policy, reached from the other direction — the declaration exists, the policy was simply never written — and it says whether a registered route currently matches, so a live breakage is distinguishable from one that is only latent.

### Why a request was denied

Every denial answers with the same status and the same body, on purpose: which check refused a caller is configuration detail, and a Medusa backend is usually reachable from the internet. The reason goes to the log instead, at `debug`:

```
[access] denied (missing_grant): GET /admin/products
```

The tokens are `sealed_namespace`, `no_actor`, `no_resolver`, `missing_grant`, `unenforceable_scope`, `non_canonical_scope`, `multi_operation_scope`, `mutation_without_assert`, `scope_resolver_failed` and `empty_scope_filter`. Turn on `debug` when you need to answer "why is this user getting a 403". Configuration faults — an unregistered scope, a resolver that throws — additionally warn once at boot-adjacent level, since those need fixing rather than explaining.

## Gating admin UI on permissions

Admin widgets run in the browser and can't import the server-side guards, so they check permissions by fetching the current user's granted list from `GET /admin/access/me/permissions` and looking for the string they need. The response also carries a `scoped` array for grants the actor holds only within a scope (see [Scoping access to rows](#scoping-access-to-rows)); the examples below only read `permissions` — a scoped grant is not a safe basis for showing unrestricted UI, so treat anything in `scoped` the same as "not granted" unless you're specifically building UI for scoped access.

**Pattern A — access is installed.** Render a widget only for users who can read content:

```tsx
import { useQuery } from '@tanstack/react-query'

const { data } = useQuery({
	queryKey: ['access-me-permissions'],
	queryFn: async (): Promise<{ permissions: string[] }> => (await fetch('/admin/access/me/permissions', { credentials: 'include' })).json()
})

if (!data?.permissions?.includes('content:read')) {
	return null
}
```

**Pattern B — degrade gracefully when access may not be installed.** When the plugin isn't installed the endpoint 404s; treat that as "no access control" and render for everyone, but gate when it _is_ installed:

```tsx
const { data: access, isLoading } = useQuery({
	queryKey: ['access', 'me', 'permissions'],
	queryFn: async (): Promise<{ permissions: string[] } | null> => {
		try {
			return await sdk.client.fetch<{ permissions: string[] }>('/admin/access/me/permissions')
		} catch {
			return null // route 404s → access plugin not installed
		}
	},
	retry: false,
	staleTime: 5 * 60 * 1000
})

const accessInstalled = !!access
const canRead = !accessInstalled || !!access?.permissions?.includes('complaint:read')

if (isLoading) return null
if (accessInstalled && !canRead) return null
```

Remember that UI gating is **advisory** — it improves the experience but is not the security boundary. Because the API is guarded server-side, the underlying data stays protected even if a widget is shown. (You can also skip a guarded data request entirely when the user lacks permission, to avoid a doomed `403`.)

Both patterns are demonstrated in the reference widgets: `apps/backend/src/admin/widgets/product-content-access.tsx` (Pattern A) and `packages/complaints/src/admin/widgets/customer-complaints.tsx` (Pattern B).

## Checking a permission in a route handler

For imperative checks inside a handler, `hasPermission` resolves whether a set of roles grants some actions:

```ts
import { hasPermission } from 'medusa-plugin-access'

const allowed = await hasPermission({
	roles: roleIds, // the actor's access_roles ids
	actions: [{ resource: 'content', operation: 'update' }],
	container: req.scope
})
```

In most cases you don't need this — declaring the route lets the global guard do the check for you.

## Enforcing outside HTTP

Workflow steps, scheduled jobs, subscribers, and anything else without a request have no guard in front of them. Two doors are available, and the difference between them matters.

**`hasPermission` — the strict boolean.** It returns `false` for a scoped grant, even one the actor genuinely holds. That is deliberate and it is the safe direction: a boolean caller has nowhere to put a row filter, so admitting a scoped actor would admit them _unnarrowed_ — strictly worse than denying. The consequence to plan for is that a scoped grant is invisible to every boolean caller.

```ts
import { hasPermission } from 'medusa-plugin-access'

const allowed = await hasPermission({ roles: roleIds, actions: [{ resource: 'content', operation: 'update' }], container })
```

**`authorize` — the decision-returning door.** Use it wherever narrowing _is_ possible. It returns whether the grant was made and, separately, the scopes it was made at, so the caller can apply the filter itself:

```ts
import { authorize } from 'medusa-plugin-access'

const decision = await authorize({ roles: roleIds, actions: [{ resource: 'content', operation: 'update' }], container })
if (!decision.granted) throw new Error('forbidden')
// decision.scopes is empty for an unrestricted grant; non-empty means the caller
// must narrow to those scopes before touching rows.
```

Resolving roles for a non-HTTP actor is `resolveActorRoles(actorType, actorId, container)`. It returns the role ids, or `null` when no resolver is registered for that actor type — which is what the guard turns into a `403` rather than treating as "no roles".

Inside a request, prefer neither: declare the route and let the guard run, and for a scoped mutation call `assertScope` (see [Scoping access to rows](#scoping-access-to-rows)).

## Scoping access to rows

A **scoped grant** attaches a named restriction to a policy assignment, describing a subset of rows instead of every row of that resource. This document writes a scoped grant as `resource:operation@scope` (e.g. `customer:delete@own`) as shorthand for "the `customer:delete` policy, assigned with scope `own`" — that string is never actually stored or parsed anywhere; on the wire and in the database the policy id and the scope are two separate fields.

Scopes express **ownership-shaped row reachability** — the `@own` / `@company` cases: "the rows this actor owns or belongs to," not an arbitrary predicate. A scope produces a **query filter**, never a hand-written row test — the predicate is always evaluated by the database. At the query's root that filter is merged into the fetch itself, so a route whose handler never queries the scoped resource can't be narrowed at all (see [Fail-closed surfaces](#fail-closed-surfaces)); for a scoped relation nested in a response, the same filter is applied in a second lookup once the rows are back. An **unscoped grant is the norm** and behaves exactly as it always has; everything in this section only comes into play once a role holds a policy _at a scope_.

### `defineScope`

Register a scope with `defineScope({ name, resource, filter })`. `filter` receives the acting actor (`{ id, type }`) and the request container, and must resolve to a **root-level** query filter — an object of columns the resource itself can be filtered on directly.

The registry is keyed by `(resource, name)`, not by `name` alone, so the same scope name can mean something different per resource (there's no single shared "ownership" concept) and, just as importantly, two unrelated resources can both define an `own` scope without colliding. Registering the same `(resource, name)` pair twice throws `MedusaError.Types.INVALID_DATA`.

A single resource can register more than one named scope. For example, `customer` might have both an `own` scope (a customer acting on themselves) and a `company` scope (a B2B user acting on every customer that belongs to their company):

```ts
import { defineScope } from 'medusa-plugin-access/utils'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

defineScope({
	name: 'own',
	resource: 'customer',
	filter: async actor => ({ id: actor.id })
})

defineScope({
	name: 'company',
	resource: 'customer',
	filter: async (actor, container) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: 'customer',
			fields: ['company.members.id'],
			filters: { id: actor.id }
		})
		const memberIds = data[0]?.company?.members?.map((m: { id: string }) => m.id) ?? []
		return { id: memberIds }
	}
})
```

A role can then hold `customer:delete@own`, `customer:delete@company`, both, or neither — a plain unscoped `customer:delete` remains the unrestricted grant. Holding both scopes grants the union of their filters (see [Composition rules](#composition-rules)); holding one, a read against `customer` narrows automatically, while a mutation additionally needs the route to declare `assertsScope` and the handler to call `assertScope` first — see [How enforcement works](#how-enforcement-works).

**Root-filter constraint.** Medusa's query layer prunes filters applied to expand nodes, so a scope cannot be expressed as a nested filter shape — filtering `customer` by `company.members.id` directly on the expanded relation is never enforced, no matter how the query is shaped. This is a permanent, upstream limit: at fetch time only the query's root is narrowed. A nested collection in the _response_ is narrowed separately, after the fetch — see [How enforcement works](#how-enforcement-works). The `company` example above resolves the relationship itself, inside the filter function, down to a plain `id` list — a column `customer` carries directly — before returning it. Any scope whose restriction lives behind a relationship has to do the same resolution step.

### Composition rules

These are the rules the query interceptor enforces when it resolves and merges scope filters (see [How enforcement works](#how-enforcement-works)):

1. **Grant AND scope.** Holding a scoped grant never bypasses the filter — it only ever narrows what an unscoped grant of the same policy would allow.
2. **Scopes OR each other.** A role that holds the same action at two different scopes (e.g. both `customer:delete@own` and `customer:delete@company`) is entitled to the union of both filters, not just one — live-proven even when the two scopes filter on different keys (an `$or` across them, not an intersection). In practice the union arises **across roles**, not within one: `access_role_policy` has a unique index on `(role_id, policy_id)` with no `scope` column, so one role can't hold one policy at two different scopes — an actor gets there by holding two roles, one per scope.
3. **A wildcard grant is always unrestricted and cannot carry a scope.** `*:*` and `resource:*` grant everything for what they match; assigning a scope alongside a wildcard policy is rejected outright (see validation rules below), and if a scope value were ever stored against a wildcard grant regardless, it is ignored rather than honored.

### How enforcement works

When `authorize()` reports that a granted policy is held only at a scope, the guard resolves every required scope's filter once — calling each `defineScope` filter with the acting actor and the request container — and then wraps the request's query object for the rest of the request: `query.graph`, `query.index`, `query.gql`, and the raw remote-query callable, covering both the `QUERY` and `REMOTE_QUERY` container registrations so every caller sees the same wrapped query. The original, unwrapped query stays reachable internally (as `ACCESS_UNSCOPED_QUERY`) so permission resolution never ends up filtering its own lookup. An unrestricted grant never triggers any of this — an actor holding every required policy unrestricted sees no wrapping at all.

From there, every `query.graph({ entity, filters, ... })` call the handler makes against a scoped resource's root has that resource's filter merged into `filters` automatically — intersected with whatever filter the handler already passed, or unioned across multiple granted scopes (see [Composition rules](#composition-rules)). **Reads flip automatically**: a `GET` handler that already calls `query.graph` on the scoped root needs no code changes to become scope-aware.

**Mutations are different.** A `POST`/`PUT`/`PATCH`/`DELETE` against a resource held only at a scope is denied at the door unless the matched route declared `assertsScope: true` — an option on both `requirePolicies` and `guardResource` — and even then, the handler itself must call `assertScope` before it writes:

```ts
import { assertScope } from 'medusa-plugin-access/utils'

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
	await assertScope(req, { resource: 'customer', id: req.params.id })
	// ... proceed with the mutation
}
```

`assertScope` is a no-op when the actor's grant for that resource isn't scoped this request, so it's safe to call unconditionally ahead of a mutation. When it does apply, it re-queries the id(s) through the same scope filter and throws `404` if any fall outside it. It also independently re-confirms the filter was actually applied — the same class of misconfiguration the fail-closed checks below guard against — and throws `403` rather than silently trust an unfiltered query. This plugin's own `POST /admin/access/roles/:id` is the worked example: it declares `assertsScope`, looks the role up through the scoped query, and calls `assertScope` before handing off to the update workflow, which writes by selector through the module service where the interceptor cannot reach.

`assertsScope: true` passed to `guardResource` is a **subtree-wide promise**, not a per-route one: `guardResource` declares the prefix and its whole `/*` subtree together, and a mutating request is admitted if _any_ matching declaration set `assertsScope` — not only the specific route you had in mind. Set it only once every mutating handler under that entire prefix calls `assertScope`.

**Restricted fields are pruned before the query runs.** On a scoped request, field paths resolving
to an entity the actor cannot `read` are removed from the selection before it executes, so that data
is never fetched rather than fetched and stripped off the response afterwards. Pruning applies to the
scoped resource's own query: a request holding only unrestricted grants builds no interceptor and so
prunes nothing, and even on a scoped request a query rooted at some other entity is left alone. The
response filter still runs as the second line — it is what covers a response that was never built from the query
layer at all, and what covers a pruning fault (pruning fails open, which is safe precisely because
the strip is still there). **A relation you hold only at a scope is kept, and its rows are narrowed.** The read check is
scope-aware (`authorize`, not the strict `hasPermission`), so holding `order:read@sales_channel` and
asking for `customers?fields=id,orders.*` keeps the `orders` branch rather than stripping it. The
query layer cannot filter it — Medusa prunes filters pushed onto an expand node, so only the query's
root is narrowed at fetch time — so the response pass narrows it instead: it collects the ids the
relation already carries and asks the database which of them the scope admits, then drops the rest.
The predicate is still evaluated by the database, not by a hand-rolled row test.

**A relation you cannot read at all is removed outright**, key and all — not merely emptied of its fields. Deleting just the fields would leave `orders: [{}, {}, {}]` behind, which still tells an actor with no `order:read` how many orders the customer has. Where a denied relation is nested under a readable one, the branch that goes is the outermost denied ancestor.

**The enforcement ledger backstops all of it.** A request carrying a scope gets `req.accessEnforcement = { required, narrowed, asserted }` — `required` is the set of resources that need narrowing; a scoped `query.graph` call adds its resource to `narrowed`, and a passing `assertScope` adds it to `asserted`. Just before a response whose status is **under `400`** is sent, the guard confirms every required resource is in `narrowed` or `asserted`; if not, it replaces that response with `403` instead of letting an unfiltered or unproven success leave the process.

The check covers every terminal response path, not only `res.json`: `res.send`, `res.write`, `res.end`, `res.writeHead` and anything routed through them (a string, a `Buffer`, a file download, a stream) get the same treatment, so a scoped route answering with something other than JSON cannot ship unnarrowed. If the violation only becomes detectable after headers have gone out — a stream that started before the handler finished — the response is destroyed and logged at error level rather than completed, since a truncated body beats a complete unnarrowed one. An already-failing response (`400` and above) passes through unchanged — the check only ever intercepts what looked like a success. Headers the replaced response had already set — `Content-Length`, `Location`, `Content-Disposition` and the rest of the entity set — are cleared before the denial body is written, so a refused redirect or file download is a well-formed `403` rather than one whose declared length disagrees with its body.

And because interception can only cover paths that go through `res`, a `finish` listener watches for anything that escaped them — a raw socket write, a proxy piping straight through, a middleware holding a terminal method it captured before this guard ran. It cannot deny at that point, the bytes are already gone; it logs at error level naming the route and the unnarrowed resources, so an escape is loud rather than silent.

This is what makes the model safe to turn on for a handler nobody has individually audited: forgetting to query the scoped root, or a sub-resource route that only ever queries something else, gets a `403` instead of a silent leak.

`hasPermission` is unaffected by any of this: it stays strict (see [Checking a permission in a route handler](#checking-a-permission-in-a-route-handler)) and returns `false` for a scoped grant regardless of whether the interceptor could narrow it. `authorize()` + `decision.scopes` remains the door for a non-HTTP caller — a workflow step, a job — that wants to apply the filter itself.

### Fail-closed surfaces

Every shape the interceptor can't safely filter denies rather than admits unfiltered, for as long as any scope is active on the request:

- **`query.gql`** always denies — a GraphQL string can't be filtered without parsing it.
- **`query.index`** denies when its root is one of the request's scoped resources. (`index()` calls `.graph` on the query object's own prototype internally, so wrapping the exported `.graph` property alone doesn't intercept it.)
- **The raw remote-query callable** — calling `query(...)` directly instead of `query.graph(...)` — denies for the same reason, when its root resolves to a scoped resource.
- **An unrecognized query root** denies on _any_ entry point (`.graph`, `.index`, or the raw callable), for _any_ root, as long as some scope is active on the request — not only when that particular root happens to be scoped. A root that can't be resolved to a canonical entity name can't be proven safe, so it's treated as unsafe.
- **An unmergeable filter collision** — the handler's own filter and the scope's filter can't be combined (e.g. one side of the merge is operator-shaped, such as `{ id: { $in: [...] } }`, on a key the other side also filters) — denies with `403 FORBIDDEN`. This is distinct from a plain scalar/array id filter that merges cleanly but simply doesn't intersect with the scope: that case narrows to nothing and surfaces as an ordinary `404` (or an empty list), not a denial.
- **An empty id-list** — a scope filter, or its merge with the handler's filter, that narrows to zero ids — matches nothing: the fetch throws `404` when the caller passes `throwIfKeyNotFound` (Medusa's standard single-row retrieve pattern); otherwise it comes back as an ordinary empty result (an empty list, or a single-row fetch that didn't request the flag). Normal not-found/empty-list behavior, not an error, but it never widens.
- **A scope resolver that throws, or resolves to an empty `{}` filter**, denies the whole request. An empty filter would merge as "no filter," silently widening access instead of narrowing it, so it's treated as a resolver fault.
- **A `defineScope` resource name that isn't the canonical entity name** denies. The interceptor keys filters by canonical query-root name — the same resolution a query's own root goes through — so a scope registered under an alias could never be matched, and is as unenforceable as a missing registration. `defineScope` itself only checks for a duplicate `(resource, name)` registration; it never validates that `resource` is canonical, so this is validated per request, not at registration time.
- **A route requiring two different operations on one scoped resource** denies. `authorize()` flattens per-operation scope sets into one set per resource; OR-combining two different operations' scopes would widen access (rows either operation could reach) instead of narrowing it. This is not a theoretical edge: core's all-methods read floor plus its per-method write declaration produce exactly this shape, which is why a scoped actor is refused on core admin writes — see [Scoped actors cannot write through core admin routes](#scoped-actors-cannot-write-through-core-admin-routes).
- **A scoped relation whose rows can't be checked** — the whole relation is dropped from the response rather than shown unnarrowed. That covers a scope with no `defineScope` registration, a relation row carrying no `id` to check, a scope filter that can't be combined with the id lookup, and a lookup that throws.
- **A sub-resource route that never queries the scoped root** — the enforcement ledger withholds the response with `403`, even though the handler itself never errored. `GET /admin/access/roles/:id/policies` is exactly this case: it's declared under `access_role:read`, but its handler queries `access_role_policy`, which the interceptor never touches, so `access_role` never gets marked narrowed and the ledger replaces the response.

One thing worth stating plainly, since it's easy to assume otherwise:

- **The `404`/`403` split above is deliberate.** An operator-shaped scope filter colliding with a handler filter surfaces as `403`, because the two filters genuinely couldn't be combined — the outcome is unknown, not "no match." A plain scalar/array id filter that merges cleanly but intersects to nothing surfaces as `404` (or an empty list), the same as any other not-found — the outcome is known, and it's "no rows."

### Scoped actors cannot write through core admin routes

Worth stating on its own, because it decides whether a scoped role is usable at all: **a scoped grant is refused on every core admin `POST`/`PUT`/`PATCH`/`DELETE`.** Reads narrow normally. Writes need routes you declare yourself.

Two independent reasons, either sufficient:

1. **No core route declares `assertsScope`.** A scoped mutation is refused at the door unless the matched declaration says a handler will prove the scope, and nothing in core calls `assertScope`. Admitting those routes would admit them *unnarrowed*, which is why the gate is there.
2. **Core's read floor collides with its write declaration.** The pinned map declares an all-methods floor per resource (`/admin/customers/*` → `customer:read`) alongside per-method entries (`POST /admin/customers/:id` → `customer:update`). Declarations AND, so such a request requires `[customer:read, customer:update]` — two operations on one scoped resource, which is refused because OR-combining their scope sets would widen access rather than narrow it.

The second fires before the first, so declaring `assertsScope` on core routes would not by itself be enough.

What this means in practice: scope a role for **reading**, and give it a prefix you own for anything that writes. `2026-08-03-channel-scoping.md` in this package records what supporting core mutations would take.

### Caveats

- **`assertScope` only works inside a guarded HTTP request.** It reads the enforcement ledger off `req`, so it is inert in a workflow step, a subscriber, or a job — there is no request there to carry one. A non-HTTP caller that needs to narrow should call `authorize()` and apply `decision.scopes` itself.
- **The ledger is satisfied per resource, not per row.** Once a handler calls `assertScope` for one id of a resource, that resource counts as proven for the rest of the request. A handler that afterwards returns more rows of the same resource, fetched outside the query layer, would ship them unnarrowed. Assert immediately before the write, not once at the top of a handler that goes on to do other things.
- **Create operations can't be scoped by the interceptor.** There's no existing row to fetch and filter on a `POST` that creates one — `assertScope` is built around confirming an id already inside a scope's filter, which doesn't apply yet. Scoping a `create` operation means writing your own check against the request payload (e.g. verifying a `company_id` in the body matches the actor's own), not relying on the interceptor.
- **A scope keyed on a mutable attribute of the row can 404 a self-removing mutation on its own response.** A scope's filter is resolved once, at the start of the request — not re-evaluated per query — but if it constrains on a column the mutation itself changes (rather than a stable identifier), a handler's post-write re-fetch (a common pattern: run the workflow, then `query.graph` the fresh row to build the response) can merge against a row that no longer matches, and 404 despite the write having succeeded. Prefer a scope resolved to a stable key — an `id` list snapshotted once, the way the `company` example above resolves membership — over a filter that reads a column the same update can change, especially for a scope guarding an update-heavy resource.

### Assigning a scoped grant

`POST /admin/access/roles/:id/policies` accepts `policies` as an array whose entries are either a bare policy id string (unrestricted, as before) or `{ id, scope }` (scoped):

```json
{ "policies": ["policy_123", { "id": "policy_456", "scope": "own" }] }
```

The request is rejected (`400`) when:

- a scope is supplied for a wildcard policy (`*:*` or `resource:*`),
- the scope name has no matching `defineScope` registration for that policy's resource,
- the same policy id appears more than once in the same request (with or without a scope) — the underlying `(role_id, policy_id)` unique index has no `scope` column, so two rows for one policy can never coexist regardless of scope.

`GET /admin/access/roles/:id/policies` returns `scope` on each assignment. To change one in place, `POST /admin/access/roles/:id/policies/:policy_id` with `{ "scope": "company" }` — or `{ "scope": null }` to clear it back to unrestricted. It is subject to the same assignability rule and the same scope validations as the original assignment, since a re-scope is an assignment.

**`canGrantScope`** governs who may assign a scoped policy: an actor may grant `resource:operation` at scope `S` only if their own effective permissions hold that same `resource:operation` either unrestricted or at exactly scope `S`. Two different scope names are incomparable — holding `@own` does not let you grant `@company`. This is the same "you can't grant what you don't hold" rule extended with scope, enforced consistently for assignable-policy listings, assignable-role listings, and the create/update validation path.

### Worked example: B2B company ownership

The canonical case. A `company` entity is linked to `customer`, and a company administrator manages the customers belonging to their own company — nobody else's.

**1. Resolve the relationship to a plain column.** The scope filter must return a root-level filter, so the membership walk happens inside the filter and comes out as an id list:

```ts
import { defineScope } from 'medusa-plugin-access'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

defineScope({
	name: 'company',
	resource: 'customer',
	filter: async (actor, container) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: 'customer',
			fields: ['company.members.id'],
			filters: { id: actor.id }
		})
		return { id: data[0]?.company?.members?.map((m: { id: string }) => m.id) ?? [] }
	}
})
```

**2. Grant it.** A `Company Admin` role holds `customer:read@company`, `customer:update@company` and `customer:delete@company`. Note the scope is repeated per grant — a scope rides on the grant, not on the role, so `customer:create` left unscoped on the same role would be an unrestricted grant.

**3. Reads need nothing further.** `GET /admin/customers` narrows to the company automatically, and `GET /admin/customers/:id` for someone else's customer returns `404` rather than `403` — no existence leak.

**4. Writes need a route you own — Medusa's own Customers page will not work.** This is the step to plan around, not a detail: a scoped grant on a mutating route is refused at the door unless that route's declaration opted in with `assertsScope`, and the pinned core-route map never does. So a Company Admin holding `customer:update@company` gets `403` on `POST /admin/customers/:id`, and on every other core admin write. Reads narrow; writes go through routes you declare yourself:

```ts
guardResource({ resource: 'customer', prefix: '/admin/company-customers', assertsScope: true })
```

```ts
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	await assertScope(req, { resource: 'customer', id: req.params.id })
	// the id is inside the actor's company — proceed
}
```

**5. Delegation is bounded automatically.** A company admin holding `customer:delete@company` can grant `customer:delete@company` onward, but not `customer:delete` unrestricted and not `customer:delete@own` — `canGrantScope` requires unrestricted-or-exact-match. And because the filter resolves per actor, the grantee gets _their_ company, not the granter's.

Ownership fits the model well because it is a property of the row, reachable as a column. What it does not give you is a scoped operator working inside the stock admin UI — see [Scoped actors cannot write through core admin routes](#scoped-actors-cannot-write-through-core-admin-routes).

### Worked example: constraining an operator to a sales channel

Worth walking through because it is the case the model fits **least** well. Read it as a list of constraints rather than a recipe.

A sales channel is not ownership — it is a cross-cutting constraint over many resources at once. The mechanics do work for a single resource that carries a channel column:

```ts
defineScope({
	name: 'sales_channel',
	resource: 'order',
	filter: async (actor, container) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: 'user',
			fields: ['sales_channels.id'],
			filters: { id: actor.id }
		})
		return { sales_channel_id: data[0]?.sales_channels?.map((c: { id: string }) => c.id) ?? [] }
	}
})
```

`order` carries `sales_channel_id` as a real column, so that filter merges straight into the fetch. There is no built-in user↔sales-channel link — the `defineLink` behind `sales_channels` above is yours to declare.

Five things to know before relying on it:

- **A scope is actor-relative by design.** `@sales_channel` always means "the channels _this_ actor is linked to", so you get "only Channel A" by linking the actor to Channel A — not by naming the channel in the grant. One role definition then serves every channel, and two operators holding it see different rows. The flip side is deliberate and worth knowing: a role cannot be pinned to a channel independently of who holds it, and there is no way to express a negative rule like "no `customer:write` in Channel A" — the model is additive, so withholding something means not granting it.
- **Every grant must repeat the scope.** Scope rides on the grant, so a channel-constrained role means `@sales_channel` on all of its grants; one omission is an unrestricted grant on that resource. This is the deliberate trade for keeping declarations flat, and it is the sharpest edge of the model.
- **One `defineScope` per resource, and not every resource can express it.** `order` is easy. `product` relates to sales channels through a link module with no column on `product`, so its filter would have to pre-resolve to a product id list — unbounded for a real catalogue.
- **Core admin mutations are refused outright.** A scoped grant on a mutating route is denied unless that route declares `assertsScope`, and the pinned core-route declarations do not — nothing outside your own code calls `assertScope`. So a channel-scoped operator can read core admin surfaces narrowed, and cannot write through them at all.
- **`create` cannot be scoped.** There is no row to filter on a `POST` that makes one, so nothing stops a channel-scoped actor creating an order in another channel. That needs a payload check you write yourself.

For a **read-only** channel-scoped role over resources that carry a channel column, this works today. For a channel-constrained operator who also writes, it does not — see `2026-08-03-channel-scoping.md` for what that would take.

## Custom actor types

An **actor type** is the string Medusa's auth system stamps onto `req.auth_context.actor_type` when it authenticates a request — `user` for an admin session, `customer` for a storefront session, `api-key` for a request authenticated with a secret API key. The global guard reads `req.auth_context.actor_type` and `req.auth_context.actor_id` on every guarded request and asks "what roles does this actor hold?" before checking the route's required policies. How it answers that question is pluggable per actor type.

Three resolvers ship out of the box:

- **`user`** — the actor's own `access_roles` link (a user is linked to roles directly).
- **`customer`** — the union of roles linked directly to the customer and roles held by any of the customer's **groups**.
- **`api-key`** — the key's own `access_roles` link (scoped API keys), resolved from the `api_key` entity.

If your plugin introduces a new kind of authenticated caller — a vendor, an affiliate, a support-desk agent authenticated by a different system — the built-in resolvers don't know how to find its roles, and the guard denies every request from that actor type by default (logging a one-time warning naming the unresolved type). `registerActorResolver` is how you teach it.

### `registerActorResolver`

```ts
import { registerActorResolver } from 'medusa-plugin-access'
import type { MedusaContainer } from '@medusajs/framework/types'

registerActorResolver({
	actorType: 'affiliate',
	resolve: async (actorId: string, container: MedusaContainer): Promise<string[]> => {
		// return the access_role ids this actor holds
		return []
	}
})
```

- Call it once, at module-body evaluation time, from a file the API loader scans on boot — the same place the plugin's own built-ins register themselves (`src/utils/actor-resolvers.ts`). A project-level `src/api/middlewares.ts`, or a middlewares/loader file in your own plugin, both run early enough.
- `resolve` receives the raw `actor_id` from `req.auth_context` and the request's scoped container (`req.scope`), and must resolve to an array of `access_role` ids — `[]` if the actor holds none. Registering `undefined`/throwing is not handled specially; let it resolve to `[]` for "no roles" and reserve throwing for genuine faults.
- **`user`, `customer`, and `api-key` are reserved.** They're registered by this plugin's own built-ins before your code runs, and `registerActorResolver` throws `MedusaError.Types.INVALID_DATA` if you register any of them again.
- **Registering any `actorType` a second time throws**, reserved or not — there is no override flag. A silent replacement of an already-registered resolver is treated as a mistake, not an intentional override; pick a distinct `actorType` instead.
- The resolver only receives `actorId` and `container` — not the request or the full `auth_context`. If role membership needs to be read off the JWT's `app_metadata`/`user_metadata` rather than looked up by id, this signature can't express that; resolve it from the database instead (see `linkedAccessRoles` below).

### Wiring authentication for a custom actor type: `authenticate` / `prefixes`

The guard is mounted at `/*` and runs ahead of every other route's own middleware (see [Why a custom prefix needs `authenticate`/`prefixes` at all](#why-a-custom-prefix-needs-authenticateprefixes-at-all) below for why) — so if your actor type needs its own authentication step (e.g. a bearer token scheme only your plugin understands), that step has to run _inside_ the guard itself, before the guard checks `req.auth_context`. `registerActorResolver` accepts an optional paired `authenticate`/`prefixes` for exactly this:

```ts
import { authenticate } from '@medusajs/framework/http'
import { registerActorResolver, linkedAccessRoles } from 'medusa-plugin-access'

registerActorResolver({
	actorType: 'affiliate',
	resolve: linkedAccessRoles('affiliate'),
	authenticate: authenticate('affiliate', ['bearer']),
	prefixes: ['/affiliate']
})
```

- **Reserved and rejected prefixes.** `prefixes` may not be empty, may not be the root (`/`), and may not be `/admin` or `/store` — core already authenticates those two and an authenticator there could reject traffic they allow. All four throw `MedusaError.Types.INVALID_DATA` at registration.
- `authenticate` and `prefixes` are a pair — supplying one without the other throws. An `authenticate` with no `prefixes` would run on every request regardless of actor type; `prefixes` with nothing to authenticate declares a surface nothing can ever populate `auth_context` for.
- The check only happens on routes that have declared policies (via `requirePolicies`/`guardResource`) — a route with no declared policy skips this entirely (see [Notes](#notes)). For a route that does have declared policies, after route matching the guard checks `req.auth_context?.actor_id`; if that's not yet set, it runs whichever registered `authenticate` has a prefix matching the request path (matched on a full path segment, not a raw substring) before resolving the actor's roles. This is what makes a custom actor type's own auth run in time — see the worked example below.
- **First-registration-wins on overlapping prefixes.** If two registrations declare overlapping `prefixes` (e.g. `/affiliate` and `/affiliate/admin`), the guard runs whichever was registered first for a matching request. This is deterministic within a single boot but depends on plugin load order across environments — avoid overlapping `prefixes` across plugins.

### `linkedAccessRoles(entity)`: the common case

Most actor types will simply carry a direct `access_roles` module link, exactly like `user` and `api-key` do. `linkedAccessRoles` is the resolver factory the built-ins are written with:

```ts
import { resolveUnscopedQuery } from 'medusa-plugin-access'

const linkedAccessRoles =
	(entity: string): ActorRoleResolver =>
	async (actorId, container) => {
		// `resolveUnscopedQuery`, not `container.resolve(QUERY)`: on a scoped request
		// the container's query IS the row-filtering interceptor, so resolving it
		// here would filter the resolver's own role lookup — or refuse it outright,
		// since `access_role` is not a root the interceptor recognises mid-resolution.
		const query = resolveUnscopedQuery(container)
		const { data } = await query.graph({
			entity,
			fields: ['access_roles.id'],
			filters: { id: actorId }
		})
		return data?.[0]?.access_roles?.map(role => role.id).filter(Boolean) ?? []
	}
```

`entity` is the **Query module's** entity name for the linked module — not necessarily the `actor_type` string. They usually match (`registerBuiltinActorResolver({ actorType: 'user', resolve: linkedAccessRoles('user') })`), but they don't have to: the `api-key` actor type is authenticated as `api-key` (hyphenated — that's what Medusa's core auth middleware hardcodes into `auth_context.actor_type`), while the linked module's entity is `api_key` (underscored — the API Key module's linkable name), so the plugin registers `linkedAccessRoles('api_key')` under the `'api-key'` actor type. Get this wrong and the query silently resolves against the wrong (or a nonexistent) entity.

### Worked example: an `affiliate` actor type

Say a separate `medusa-plugin-affiliates` plugin defines its own `affiliate` module and wants affiliates gated by `medusa-plugin-access` the same way users and customers are.

**1. Link the affiliate module to the access module.** In the affiliate plugin's own `src/links/affiliate-access-role.ts`, following the same shape as this plugin's `src/links/user-access-role.ts`:

```ts
import { defineLink } from '@medusajs/framework/utils'
import AffiliateModule from '../modules/affiliate'
import AccessModule from 'medusa-plugin-access/modules/access'

export default defineLink(
	{
		linkable: AffiliateModule.linkable.affiliate,
		isList: true
	},
	{
		linkable: AccessModule.linkable.accessRole,
		isList: true,
		filterable: ['id', 'name']
	}
)
```

This is the same link declaration this plugin uses for `user`, `customer_group`, and `api_key` — importing `AccessModule` from `medusa-plugin-access/modules/access` (the package's `./modules/*` export path) rather than from a relative path, since the link now spans two separately-published packages. This gives affiliates an `access_roles` field, queryable the same way `user.access_roles` is.

**2. Register the resolver**, once, at boot — in the affiliate plugin's own `src/api/middlewares.ts`. If affiliates authenticate through core's generic `POST /auth/:actor_type/:auth_provider` under `/admin` or `/store`, `resolve` alone is enough, exactly like `user`/`customer`/`api-key`. If affiliates need their own prefix (e.g. `/affiliate/*`) authenticated on the way in, pair `resolve` with `authenticate`/`prefixes` (see [Wiring authentication for a custom actor type](#wiring-authentication-for-a-custom-actor-type-authenticate--prefixes) above) — that's the seam that makes case 2 possible:

```ts
import { authenticate } from '@medusajs/framework/http'
import { linkedAccessRoles, registerActorResolver } from 'medusa-plugin-access'

registerActorResolver({
	actorType: 'affiliate',
	resolve: linkedAccessRoles('affiliate'),
	authenticate: authenticate('affiliate', ['bearer']),
	prefixes: ['/affiliate']
})
```

**3. Require policies on the affiliate routes**, the same way any other plugin does (see [Guarding your own API routes](#guarding-your-own-api-routes)):

```ts
import { definePolicies, generateResourcePolicies, requirePolicies } from 'medusa-plugin-access'

definePolicies(generateResourcePolicies(['affiliate_payout']))
requirePolicies({
	matcher: '/affiliate/payouts',
	method: ['GET'],
	policies: [{ resource: 'affiliate_payout', operation: 'read' }]
})
```

Given an authenticated request whose `req.auth_context` reads `{ actor_type: 'affiliate', actor_id: 'aff_123' }`, the guard looks up `aff_123`'s `access_roles` and enforces the `affiliate_payout:read` policy correctly — covered by this plugin's own tests (`src/utils/__tests__/actor-resolvers.unit.spec.ts` registers and resolves a fake `affiliate` actor type this exact way). What populates `req.auth_context` in the first place for a request under `/affiliate/*` is exactly what `authenticate`/`prefixes` above is for — see the mechanics below.

### Why a custom prefix needs `authenticate`/`prefixes` at all

Medusa's core auth system _can_ issue a real, working session/JWT for a brand-new actor type — `POST /auth/:actor_type/:auth_provider` is generic; `actor_type` is a free-form string, not a fixed enum, and an affiliate plugin can register affiliates through it and get back a token carrying `actor_type: 'affiliate'`.

The problem is what happens next. Core Medusa only wires up authentication ahead of the sorted-middleware phase for two prefixes: `/admin` (hardcoded to actor type `user`, with the `api-key` special case layered on top) and `/store` (hardcoded to actor type `customer`). There is no third hook for "authenticate this other prefix as this other actor type" — a plugin can only add that itself, as an ordinary middleware entry via `defineMiddlewares`, using `authenticate` from `@medusajs/framework/http`.

That collides with this guard directly: the guard is mounted at the bare matcher `/*`, and Medusa's route sorter (`RoutesSorter`) always places a middleware registered at a single-segment matcher like `/*` ahead of any middleware registered at a deeper matcher like `/affiliate/*` — regardless of plugin load order in `medusa-config.ts`. So a plugin-registered `authenticate('affiliate', ...)` middleware mounted the ordinary way for a custom prefix would always run **after** this guard, not before it, and the guard would find `req.auth_context` empty and deny the request.

This is exactly why `registerActorResolver`'s `authenticate`/`prefixes` pair exists: rather than mounting your authenticator as its own middleware (which loses the ordering race), you hand it to the guard, and the guard invokes it itself — before evaluating `req.auth_context` — whenever the request path matches one of your declared `prefixes` and nothing has authenticated the request yet. That closes the gap the router's ordering would otherwise leave open, without requiring a change to core Medusa's router.

## API endpoints

All endpoints are under `/admin` and require an authenticated admin session; the role/policy routes additionally require the policies noted.

- `GET /admin/access/me/permissions` — the current user's granted `resource:operation` strings, sorted, with wildcards expanded. Returns `{ permissions, scoped }`: `permissions` lists only unrestricted grants (the pre-existing contract UI widgets read); `scoped` separately lists `{ resource, operation, scope }` entries the actor holds only within a scope — see [Scoping access to rows](#scoping-access-to-rows). (No policy required.)
- `GET /access/me/permissions` — the same contract on the top-level namespace, reachable by every actor type opted into `accessNamespace` (see [The `/access` namespace](#the-access-namespace)). Portals and POS clients use this one; `/admin/*` cannot authenticate them.
- `GET /admin/access/scopes` — the registered scope names per resource, from the `defineScope` registry, as `{ scopes: [{ resource, names }] }`. Backs the scope pickers in the role UI, so only enforceable scopes are ever offered. (Requires `access_role:read`.)
- `GET|POST /admin/access/roles`, `GET|POST|DELETE /admin/access/roles/:id`, `GET|POST .../:id/policies`, `GET|POST|DELETE .../:id/users` — manage roles, their policies, and their members (gated by `access_role:*` / `user:*` policies). `POST /admin/access/roles` accepts `parent_ids` and `policy_ids` alongside `name`, which is the only way to set role inheritance over HTTP.
- `GET /admin/access/roles/assignable` — the roles the caller may actually assign, filtered by what they hold themselves.
- `GET /admin/access/roles/:id/policies` returns `{ policies, inherited, ... }`. `policies` is this role's own grants; `inherited` is what it holds through its parents, each entry naming `inherited_from_role_id` / `inherited_from_role_name`. Inherited entries have no link id — detach them from the role they come from. Pass `?direct_only=true` to omit them.
- `DELETE /admin/access/roles/:id/policies/:policy_id` detaches one grant. There is no bulk detach on `.../:id/policies`.
- `POST /admin/access/roles/:id/policies/:policy_id` with `{ scope }` re-scopes an existing grant in place (`{ scope: null }` clears it back to unrestricted), instead of detach-and-reattach. Subject to the same "you may only grant what you hold" rule as assignment. `404` if the role holds no such grant — an inherited one cannot be re-scoped here, only on the role it comes from.
- `GET /admin/access/policies`, `GET /admin/access/policies/:id` — read the registered policies (gated by `access_policy:read`), and `GET /admin/access/policies/assignable` for the subset the caller may grant. `GET /admin/access/policies/:id/roles` needs `access_role:read` as well, since it reads roles.
- `POST /admin/access/policies`, `POST|DELETE /admin/access/policies/:id` — gated by `access_policy:create` / `:update` / `:delete`. Policies are declared in code and synced on boot, so these exist for completeness rather than as the normal way to manage them.
- `GET|POST|DELETE /admin/users/:id/access/roles` — read and change a user's roles. `POST` and `DELETE` both take a JSON body `{ "roles": ["acrl_…"] }`; `DELETE /admin/users/:id/access/roles/:role_id` removes a single one by path instead.

The Roles and Policies settings pages and the user-detail widget use these endpoints, so most stores never call them directly.

## Data model

The migrations create four tables:

| Table                | Purpose                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `access_role`        | A named role (`id`, `name`, `description`, `metadata`)                                               |
| `access_policy`      | A registered `resource:operation` policy (`key`, `resource`, `operation`, `name`, `description`)     |
| `access_role_policy` | Join: which policies a role grants, and at what `scope` (nullable — `null` is an unrestricted grant) |
| `access_role_parent` | Join: a role's parent role(s), for inheritance                                                       |

Users are linked to roles through a Medusa module link (managed by the framework), exposed as `user.access_roles`. The same link shape exists for other entities too — at least `customer`, `customer_group`, `api_key`, and `invite` (`customer.access_roles`, `customer_group.access_roles`, `api_key.access_roles`, `invite.access_roles`) — the built-in `customer` resolver reads the union of the customer's own link and every group it belongs to.

## Notes

**What this is built on.** Enforcement rides on Medusa's query layer — the guard, the row-filtering interceptor, and field filtering all go through `query.graph` and the module joiner configs. It never depends on `@medusajs/rbac`: that feature is behind flags expected to be removed and a licence expected to change, so nothing here imports it, extends it, or reads its route declarations at runtime. The one place core's RBAC data is touched at all is the pinned core-route map, which is a build-time snapshot of core's own `policies:[]` declarations, checked in and regenerated by hand.

- **Enforcement scope.** Once installed, the guard covers Medusa's core admin routes as well as any routes you register with `requirePolicies`. A route with no registered policy is reachable by any authenticated admin; a guarded route requires the caller to hold the policy — either unrestricted, or, where the interceptor can narrow it, within a scope (see [Scoping access to rows](#scoping-access-to-rows)). A user with no roles, or one whose only grant is a scope the interceptor can't apply (an unregistered scope, a mutating route without `assertsScope`), is denied.
- **Multiple policies are AND.** A route that lists several required policies requires the caller to hold all of them.
- **Policies are code-owned.** Declare them with `definePolicies` (directly or via `generateResourcePolicies`); the database policy table is reconciled to the code registry on every boot.
- **Permission caching.** Role→policy resolution is memoized **per request**: the first lookup for a role is shared by everything downstream in that request — the guard, the field filter, workflow steps invoked with `req.scope` — so a response that checks the same role thirty times issues one query. There is deliberately no cross-request cache, so a role or policy change takes effect on the very next request with no invalidation to get wrong.
