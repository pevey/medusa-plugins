## 0.2.0

- **Breaking (semantic):** the enforcement guard now mounts on `/*` instead of `/admin/*` — it runs on every request the app serves, not only admin ones. Two consequences for existing consumers:
   - `sealNamespace` on a prefix outside `/admin` was previously registered but inert; it now enforces. Any project that called `sealNamespace('/store/...')` (or similar) expecting it to be a no-op will start seeing `403`s on undeclared routes under that prefix.
   - `requirePolicies` / `guardResource` declarations on a non-`/admin` prefix were likewise previously inert and now enforce for real.
- Added a pluggable actor-role resolver registry (`registerActorResolver`) so the guard can resolve roles for actor types other than `user`. Register one with:
   ```ts
   import { registerActorResolver } from 'medusa-plugin-access'

   registerActorResolver({
   	actorType: 'my-actor-type',
   	resolve: async (actorId, container) => {
   		// return the array of access_role ids held by this actor
   		return []
   	}
   })
   ```
   A built-in `customer` resolver is now included, resolving a customer's roles as the union of roles linked directly to the customer and roles held through their customer groups.
- Fixed a secret API key (`actor_type: "api-key"`) crashing a declared route with a `500` — it now receives a clean `403`, with a warn-once log naming the missing actor-type resolver.
- Added scoped API key support: link a secret API key to one or more access roles (via the new `api_key ↔ access_role` link) and a request authenticated with that key resolves roles the same way a user or customer does. Lets operators issue narrowly-scoped keys, e.g. a CI key that can only read orders.
- Added a direct `customer ↔ access_role` link, so a role can be attached to an individual customer as well as to a customer group. The built-in `customer` resolver returns the deduplicated union of both. This removes the need for a plugin to override the built-in `customer` resolver just to attach roles via a different relationship (e.g. a B2B company) — `user`, `customer`, and `api-key` remain reserved actor types plugins must not override.
- `sealNamespace` now rejects an empty or root (`/`) prefix as invalid input instead of accepting it. Seal a specific path such as `/admin` or `/store`.
- **Breaking (semantic):** `registerActorResolver` now throws `MedusaError.Types.INVALID_DATA` when called with an `actorType` that already has a registered resolver, naming the conflicting actor type. Previously a second registration silently replaced the first. `user`, `customer`, and `api-key` are reserved by this plugin's built-in resolvers and are already registered by the time your code runs, so registering any of them yourself now throws. There is no override flag — pick a distinct `actorType` instead.
- Added scoped policy grants: a new `access_role_policy.scope` column lets a role hold a policy restricted to a named scope (e.g. `customer:delete` at scope `own`) instead of only the previous all-or-nothing grant. Note a scoped grant currently only **denies** — see the "Not yet enforced" entry below.
- Added `defineScope` / `getScope` / `hasScope` (exported from `medusa-plugin-access/utils`) to register and look up a named, per-resource row filter for a policy's scope, keyed by `(resource, name)`. Registering the same `(resource, name)` pair twice throws.
- Added `authorize()`, the scope-aware counterpart to `hasPermission`: resolves the full `{ granted, scopes }` decision for a set of actions, reporting which scopes (if any) a grant is restricted to instead of only a boolean.
- **Breaking (semantic):** `hasPermission` now returns `false` for a scoped grant, even when the actor genuinely holds it — it only returns `true` for an unrestricted grant, since a boolean caller has no way to apply the filter a scope implies. Existing code that starts assigning scopes to a policy it previously checked with `hasPermission` will see that check flip from `true` to `false`.
- **Breaking:** `resolvePermissions`'s return type changed from `Set<string>` (flat `resource:operation` strings) to `ResolvedPermission[]` (`{ resource, operation, scope? }`), so callers can distinguish an unrestricted grant from a scoped one.
- Role-policy assignment (`POST /admin/access/roles/:id/policies`) now accepts `policies` entries as either a bare policy id string (unrestricted, unchanged) or `{ id, scope }` (scoped). Rejects the request when: a scope is supplied for a wildcard policy, the scope has no matching `defineScope` registration for that policy's resource, or the same policy id appears more than once in one request.
- Added `canGrantScope`, enforced on role-policy assignment: an actor may grant a policy at scope `S` only if their own effective permissions hold it unrestricted or at exactly scope `S` — two different scope names are incomparable, so holding one scope never authorizes granting another.
- **Not yet enforced:** a scoped grant only ever denies today. No query interceptor exists yet to apply a `defineScope` filter, so the global guard denies any route that would require a scope rather than admitting it unfiltered. Assigning a scope today only narrows access — it does not turn on row-level filtering. See the README's "Scoping access to rows" section.
- `registerActorResolver` now accepts an optional paired `authenticate`/`prefixes`, letting a custom actor type's own authentication run inside the guard (before it inspects `req.auth_context`) for requests under a declared prefix — supplying one without the other throws. When multiple registrations declare overlapping prefixes, the guard runs whichever was registered first.

## 0.1.2

- Fix admin display issue caused by recieving unexpected data type (a nested object).

## 0.1.1

- Fix a11y issues with create modal and edit drawer
- Updated medusa packages to 2.18.0
- Bump other dependency versions
