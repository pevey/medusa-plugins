# medusa-plugin-access

A plugin to add access control based on defined roles and access policies to the Medusa v2 admin.

[Documentation](https://pevey.com/medusa-plugin-access)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- **Roles → policies → users.** A _policy_ is a fine-grained `resource:operation` grant (e.g. `product:read`); a _role_ is a named bundle of policies; admin users are assigned roles.
- **Role inheritance** — a role can inherit all of a parent role's policies.
- **Server-side enforcement** across the whole admin API — a global `/admin/*` guard returns `403` when the caller's roles don't grant a route's required policies. Hiding UI is not the security boundary; the API is.
- **Declarative route guards** — protect any `/admin/*` route (Medusa's core routes, your own, or another plugin's) by declaring the policies it requires.
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

The plugin takes **no options** — registering it installs the Access module, the admin Settings UI, the `/admin/*` enforcement guard, and the role/policy API routes.

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

**Policies are declared in code, not in the UI.** The set of assignable policies is defined in code (see [Declaring policies for your own resources](#declaring-policies-for-your-own-resources)) and synced to the database on every boot. The Policies settings page is therefore read-only, and a policy created directly in the database that has no matching code declaration is removed on the next boot.

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

// Require a policy on each route. The plugin's global /admin/* guard enforces these
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
	const { definePolicies, generateResourcePolicies, requirePolicies } =
		require('medusa-plugin-access') as typeof import('medusa-plugin-access')

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

Admin widgets run in the browser and can't import the server-side guards, so they check permissions by fetching the current user's granted list from `GET /admin/access/me/permissions` (which returns `{ permissions: string[] }`) and looking for the string they need.

**Pattern A — access is installed.** Render a widget only for users who can read content:

```tsx
import { useQuery } from '@tanstack/react-query'

const { data } = useQuery({
	queryKey: ['access-me-permissions'],
	queryFn: async (): Promise<{ permissions: string[] }> =>
		(await fetch('/admin/access/me/permissions', { credentials: 'include' })).json()
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

In most cases you don't need this — declaring `requirePolicies` for the route lets the global guard do the check for you.

## API endpoints

All endpoints are under `/admin` and require an authenticated admin session; the role/policy routes additionally require the policies noted.

- `GET /admin/access/me/permissions` — the current user's granted `resource:operation` strings, sorted, with wildcards expanded. Returns `{ permissions }`. (No policy required.)
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

Users are linked to roles through a Medusa module link (managed by the framework), exposed as `user.access_roles`.

## Notes

- **Enforcement scope.** Once installed, the guard covers Medusa's core admin routes as well as any routes you register with `requirePolicies`. A route with no registered policy is reachable by any authenticated admin; a guarded route requires the caller to hold the policy (a user with no roles is denied).
- **Multiple policies are AND.** A route that lists several required policies requires the caller to hold all of them.
- **Policies are code-owned.** Declare them with `definePolicies` (directly or via `generateResourcePolicies`); the database policy table is reconciled to the code registry on every boot.
- **Permission caching.** Effective policies per role are cached (7-day TTL) and invalidated on role/policy changes.
