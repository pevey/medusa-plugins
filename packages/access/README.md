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

The plugin takes **no options** — registering it installs the Access module, the admin Settings UI, the global `/*` enforcement guard, and the role/policy API routes. The guard itself runs on every request; the bundled core policy map only declares Medusa's admin routes, so `/admin` is what is guarded out of the box. Declaring `requirePolicies` or `sealNamespace` on any other prefix (e.g. `/store`) makes the guard enforce there too.

## Important: installing this plugin gates your entire admin

Enforcement is always on once the module is loaded. The plugin ships a pinned map of Medusa's core admin routes to the policies they require, so after install a user can only reach an admin route if one of their roles grants the matching policy.

To avoid locking yourself out, on the **first** boot after install the plugin links **every existing user** to the seeded **Super Admin** role (which holds the wildcard policy `*:*`). This runs once — the moment any user↔role link exists, it never runs again.

Consequences to plan for:

- **Existing users keep full access** (they become Super Admins) until you give them narrower roles.
- **Users created _after_ that first boot have no roles**, and will be denied on guarded routes until you assign them a role.
- Give at least one trusted account the Super Admin role (or a role with the policies needed to manage access) before you start restricting others.

## Concepts

**Policy.** A single grant, identified by the string `resource:operation` — e.g. `product:read`, `order:update`, `access_role:delete`. Operations are `read`, `create`, `update`, `delete`, and the wildcard `*`.

**Wildcards.** `*` matches any resource or operation. `product:*` grants every operation on products; `*:read` grants read on everything; `*:*` grants everything (this is what the Super Admin role holds).

**Role.** A named set of policies. Roles can have a parent role and inherit its policies (inheritance is transitive and cycle-protected).

**Policies are declared in code, not in the UI.** The set of assignable policies is defined in code (see [Guarding your own API routes](#guarding-your-own-api-routes)) and synced to the database on every boot. The Policies settings page is therefore read-only, and a policy created directly in the database that has no matching code declaration is removed on the next boot.

**Scope.** A named, per-resource restriction attached to a granted policy (e.g. `customer:delete@own`). It describes the subset of rows the grant is meant to cover — but **today a scoped grant only denies**: there is no query interceptor yet to apply the filter, so the guard rejects any route that would require one. See [Scoping access to rows](#scoping-access-to-rows).

## Managing roles and access (admin UI)

The plugin adds two pages under **Settings**:

- **Settings → Roles** — create and delete roles, edit a role's details, manage the policies attached to a role, and assign/remove users on a role.
- **Settings → Policies** — a read-only reference of every policy currently registered in code.

It also adds a widget to the **user detail** page (under the user's info) for assigning and removing that user's roles directly.

A user can only assign roles whose policies they themselves hold — you cannot grant access you don't have.

## Guarding your own API routes

The core resources ship with policies already. To protect **your own** admin routes (or a custom resource), declare its policies once and then require them per route, in your project's `src/api/middlewares.ts`:

```ts
import { defineMiddlewares } from '@medusajs/framework/http'
import { definePolicies, generateResourcePolicies, requirePolicies } from 'medusa-plugin-access'

// Register the "content" resource's policies (content:read / :create / :update / :delete)
// so they become assignable to roles and appear in /admin/access/me/permissions.
definePolicies(generateResourcePolicies(['content']))

// Require a policy on each route. The plugin's global /* guard enforces these
// and returns 403 when the caller's roles don't grant the required policy.
requirePolicies({
	method: ['GET'],
	matcher: '/admin/content',
	policies: [{ resource: 'content', operation: 'read' }]
})
requirePolicies({
	method: ['POST'],
	matcher: '/admin/content',
	policies: [{ resource: 'content', operation: 'create' }]
})
requirePolicies({
	method: ['POST'],
	matcher: '/admin/content/:id',
	policies: [{ resource: 'content', operation: 'update' }]
})
requirePolicies({
	method: ['DELETE'],
	matcher: '/admin/content/:id',
	policies: [{ resource: 'content', operation: 'delete' }]
})

export default defineMiddlewares({ routes: [] })
```

- `matcher` is an Express-style path against the full `/admin/...` URL. `:param` matches a single segment and `*` matches the rest.
- `method` defaults to all methods if omitted.
- Passing multiple policies to one route requires **all** of them (AND).

### Optional dependency (for plugin authors)

If you're writing a plugin that should work whether or not `medusa-plugin-access` is installed, require it lazily and no-op when it's absent, so your routes stay ungated on stores that don't use access control:

```ts
try {
	const { definePolicies, generateResourcePolicies, requirePolicies } = require('medusa-plugin-access') as typeof import('medusa-plugin-access')

	definePolicies(generateResourcePolicies(['complaint']))
	requirePolicies({
		method: ['GET'],
		matcher: '/admin/complaints',
		policies: [{ resource: 'complaint', operation: 'read' }]
	})
} catch {
	// medusa-plugin-access is not installed — routes remain ungated.
}
```

Declare `medusa-plugin-access` as an optional peer dependency in this case.

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

In most cases you don't need this — declaring `requirePolicies` for the route lets the global guard do the check for you. `hasPermission` is strict about scope: it returns `false` for a scoped grant, even one the actor genuinely holds — see [Scoping access to rows](#scoping-access-to-rows) below.

## Scoping access to rows

A **scoped grant** attaches a named restriction to a policy assignment, describing a subset of rows instead of every row of that resource. This document writes a scoped grant as `resource:operation@scope` (e.g. `customer:delete@own`) as shorthand for "the `customer:delete` policy, assigned with scope `own`" — that string is never actually stored or parsed anywhere; on the wire and in the database the policy id and the scope are two separate fields.

> **Read [Scoped grants only deny today](#scoped-grants-only-deny-today--there-is-no-query-interceptor-yet) before using this.** The model below describes what a scope _means_; the interceptor that would apply it as a row filter is not built. Assigning a scope today makes access strictly narrower, not more granular.

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

A role can then hold `customer:delete@own`, `customer:delete@company`, both, or neither — a plain unscoped `customer:delete` remains the unrestricted grant. Today, assigning `customer:delete@company` does not give that role delete access to their company's customers — it makes `customer:delete` return `403` for them entirely; see below.

**Root-filter constraint.** Medusa's query layer prunes filters applied to expand nodes, so a scope cannot be expressed as a nested filter shape (e.g. filtering `customer` by `company.members.id` directly on the expanded relation won't be enforced once an interceptor exists to apply it). The `company` example above resolves the relationship itself, inside the filter function, down to a plain `id` list — a column `customer` carries directly — before returning it. Any scope whose restriction lives behind a relationship has to do the same resolution step.

### Composition rules

These describe the model the eventual query interceptor will enforce — see below: today, any scope denies rather than filters.

1. **Grant AND scope.** Holding a scoped grant never bypasses the filter — it only ever narrows what an unscoped grant of the same policy would allow.
2. **Scopes OR each other.** A role that holds the same action at two different scopes (e.g. both `customer:delete@own` and `customer:delete@company`) is entitled to the union of both filters, not just one.
3. **A wildcard grant is always unrestricted and cannot carry a scope.** `*:*` and `resource:*` grant everything for what they match; assigning a scope alongside a wildcard policy is rejected outright (see validation rules below), and if a scope value were ever stored against a wildcard grant regardless, it is ignored rather than honored.

### Scoped grants only deny today — there is no query interceptor yet

**This is the single most important fact in this section.** `defineScope` records a filter for a future query interceptor to apply — that interceptor does not exist yet. Nothing in this plugin currently narrows a query's rows based on a scope. Consequently:

- `hasPermission` returns `false` for a scoped grant, even if the actor genuinely holds it. It only returns `true` for an unrestricted grant, because a boolean caller has no way to apply the filter a scope implies.
- The global `/*` guard denies the request outright whenever satisfying a route's required policy would require a scope — a scoped grant is never enough on its own to pass a guarded route. Logically the guard is doing the safe thing: admitting the request unfiltered would silently turn every scoped grant into an unrestricted one.
- If you need the actual filtered decision (to build your own row-filtering logic ahead of the interceptor), call `authorize` directly and inspect `decision.scopes` — but nothing in the plugin will apply that filter for you.

In short: **assigning a scope to a policy today makes access strictly narrower** — the actor loses the ability to use guarded routes with that policy unrestricted, and gains nothing they can act on yet. Don't assign a scope expecting the actor to get filtered row-level access; they'll get a `403` instead. Registering `defineScope` is how you _describe_ the eventual behavior in advance, not how you turn it on.

### Assigning a scoped grant

`POST /admin/access/roles/:id/policies` accepts `policies` as an array whose entries are either a bare policy id string (unrestricted, as before) or `{ id, scope }` (scoped):

```json
{ "policies": ["policy_123", { "id": "policy_456", "scope": "own" }] }
```

The request is rejected (`400`) when:

- a scope is supplied for a wildcard policy (`*:*` or `resource:*`),
- the scope name has no matching `defineScope` registration for that policy's resource,
- the same policy id appears more than once in the same request (with or without a scope) — the underlying `(role_id, policy_id)` unique index has no `scope` column, so two rows for one policy can never coexist regardless of scope.

`GET /admin/access/roles/:id/policies` returns `scope` on each assignment. There is no endpoint to change an existing assignment's scope in place — delete the assignment (`DELETE /admin/access/roles/:id/policies/:policy_id`) and re-`POST` it with the new scope.

**`canGrantScope`** governs who may assign a scoped policy: an actor may grant `resource:operation` at scope `S` only if their own effective permissions hold that same `resource:operation` either unrestricted or at exactly scope `S`. Two different scope names are incomparable — holding `@own` does not let you grant `@company`. This is the same "you can't grant what you don't hold" rule extended with scope, enforced consistently for assignable-policy listings, assignable-role listings, and the create/update validation path.

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

- `authenticate` and `prefixes` are a pair — supplying one without the other throws. An `authenticate` with no `prefixes` would run on every request regardless of actor type; `prefixes` with nothing to authenticate declares a surface nothing can ever populate `auth_context` for.
- The check only happens on routes that have declared policies (via `requirePolicies`/`guardResource`) — a route with no declared policy skips this entirely (see [Notes](#notes)). For a route that does have declared policies, after route matching the guard checks `req.auth_context?.actor_id`; if that's not yet set, it runs whichever registered `authenticate` has a prefix matching the request path (matched on a full path segment, not a raw substring) before resolving the actor's roles. This is what makes a custom actor type's own auth run in time — see the worked example below.
- **First-registration-wins on overlapping prefixes.** If two registrations declare overlapping `prefixes` (e.g. `/affiliate` and `/affiliate/admin`), the guard runs whichever was registered first for a matching request. This is deterministic within a single boot but depends on plugin load order across environments — avoid overlapping `prefixes` across plugins.

### `linkedAccessRoles(entity)` — the common case

Most actor types will simply carry a direct `access_roles` module link, exactly like `user` and `api-key` do. `linkedAccessRoles` is the resolver factory the built-ins are written with:

```ts
const linkedAccessRoles =
	(entity: string): ActorRoleResolver =>
	async (actorId, container) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
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
- `GET|POST /admin/access/roles`, `GET|POST|DELETE /admin/access/roles/:id`, `.../:id/policies`, `.../:id/users` — manage roles, their policies, and their members (gated by `access_role:*` / `user:*` policies).
- `GET /admin/access/policies`, `GET /admin/access/policies/:id`, `.../:id/roles` — read the registered policies (gated by `access_policy:read`).
- `GET|POST|DELETE /admin/users/:id/access/roles` — read and change a user's roles.

The Roles and Policies settings pages and the user-detail widget use these endpoints, so most stores never call them directly.

## Data model

The migration creates four tables:

| Table                | Purpose                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `access_role`        | A named role (`id`, `name`, `description`, `metadata`)                                           |
| `access_policy`      | A registered `resource:operation` policy (`key`, `resource`, `operation`, `name`, `description`) |
| `access_role_policy` | Join: which policies a role grants                                                               |
| `access_role_parent` | Join: a role's parent role(s), for inheritance                                                   |

Users are linked to roles through a Medusa module link (managed by the framework), exposed as `user.access_roles`. The same link shape exists for other entities too — at least `customer`, `customer_group`, `api_key`, and `invite` (`customer.access_roles`, `customer_group.access_roles`, `api_key.access_roles`, `invite.access_roles`) — the built-in `customer` resolver reads the union of the customer's own link and every group it belongs to.

## Notes

- **Enforcement scope.** Once installed, the guard covers Medusa's core admin routes as well as any routes you register with `requirePolicies`. A route with no registered policy is reachable by any authenticated admin; a guarded route requires the caller to hold the policy **unrestricted** (a user with no roles is denied, and so is one who holds the policy only at a scope — see [Scoping access to rows](#scoping-access-to-rows)).
- **Multiple policies are AND.** A route that lists several required policies requires the caller to hold all of them.
- **Policies are code-owned.** Declare them with `definePolicies` (directly or via `generateResourcePolicies`); the database policy table is reconciled to the code registry on every boot.
- **Permission caching.** Effective policies per role are cached (7-day TTL) and invalidated on role/policy changes.
