# Testing Medusa plugin packages

Conventions and footguns for the **Medusa plugin packages** in `packages/*` — the `medusa-plugin-*`
workspaces that build with `medusa plugin:build` and test with jest. They do **not** apply to the
`sveltekit-*` packages or `medusa-js-sdk`, which use vitest and plain `tsc` and share none of this
tooling.

Most of what follows exists because the failure mode is a **silent false green**: a suite that passes
while proving nothing. Read the footguns before adding tests.

## Suites

| Suite | Command | Runner | Matches |
| --- | --- | --- | --- |
| Unit | `yarn test:unit` | jest | `src/**/__tests__/**/*.unit.spec.ts` |
| Integration (HTTP) | `yarn test:integration:http` | jest + `medusaIntegrationTestRunner` | `integration-tests/http/*.spec.ts` |
| Admin | `yarn test:admin` | vitest + `medusa-admin-test-utils` | `src/admin/__tests__/**/*.test.tsx?` |
| Typecheck | `yarn typecheck` | tsc | per-package tsconfig projects |

`TEST_TYPE` selects the jest `testMatch`; see `jest.config.base.js` at the repo root, which every
package re-exports from its own `jest.config.js`. Integration runs against a real Postgres database.
`pg-god` is pinned at the repo root as a devDependency because `@medusajs/test-utils` needs it and does
not declare it — see the pg-god workaround note if it breaks after a Medusa upgrade.

Turbo tasks: `test` fans out to `test:unit` + `test:admin`; `test:integration:http` is separate and
runs with `--concurrency=1`, because the suites contend for Postgres.

Not every plugin has all three. Backend-only or provider packages (`r2`, `ses`, `tax-lookup`) ship unit
tests only; 17 packages have an integration suite and 14 have admin tests.

## Hard rules

These are not style preferences — violating them produces a suite that lies to you.

### 1. Exactly one integration spec per package

One file under `integration-tests/http/`, no exceptions. All 17 integration-tested packages follow
this today.

Multiple HTTP spec files break on jest's VM-realm `Map` identity: each spec file gets its own realm, so
framework-level registries keyed by object identity stop matching across them, and tests pass or fail
based on which file loaded first. Add `describe` blocks to the existing spec instead of a new file.

### 2. A unique `dbName` per package

`medusaIntegrationTestRunner({ dbName: 'medusa-<module>' })`, named after the **module**, not the
package directory — `packages/ratings` uses `medusa-review`, `packages/payment-braintree` uses
`medusa-payment-braintree`. Two packages sharing a database will clobber each other's template under
`--concurrency=1` reruns.

### 3. Build before integration, including dependencies

Integration specs import registered workflows from the built `.medusa/server` output rather than from
`src`, so workflow ids register once instead of twice. Run `yarn build` first.

If your package consumes another workspace plugin, build **that** package in the test script itself —
lifecycle pre-hooks do not run under this yarn version, so a `prebuild` will be skipped silently and
you get a two-realm false green. The worked example is `packages/complaints`, which consumes
`medusa-plugin-access`:

```json
"test:integration:http": "yarn --cwd ../access build && TEST_TYPE=integration:http …"
```

## Footguns

### 1. `jest.retryTimes(1)` masks the real first error

Every integration spec in the repo sets this. A retried run re-executes the whole `beforeAll`, so the
failure you are shown is usually the *second* run's — often an artifact of the first run's side effects
(an email collision from re-registering the same auth identity, a duplicate-registration throw) rather
than the real defect.

- **When debugging, set `jest.retryTimes(0)` first.** Otherwise you will chase the wrong error.
- Any `beforeAll` that registers process-global state must be **idempotent**, because it will run
  twice. Guard the registration:

  ```ts
  // `jest.retryTimes(1)` is set globally, so a retried run must not
  // re-throw on `defineScope`'s duplicate-registration guard.
  if (!hasScope('customer', 'company')) {
  	defineScope({ name: 'company', resource: 'customer', filter: async () => ({}) })
  }
  ```

- Retries also convert an *intermittent* failure into a green run. Weigh that against the flakiness it
  is hiding — for a security-relevant suite it is a bad trade.

### 2. `expect(promise).rejects` does not reliably observe workflow-engine rejections

Against the promise returned by a workflow's `.run()`, `await expect(...).rejects.toThrow(...)` can
pass without the rejection ever being observed. A plain `try`/`catch` does observe it. Assert that way:

```ts
let caught: any
try {
	await someWorkflow(container).run({ input: { … } })
} catch (e) {
	caught = e
}
expect(caught?.message).toContain('…')
```

This matters most for negative assertions — a `rejects` matcher that silently observes nothing is a
test that proves nothing.

### 3. `dbUtils.snapshot()` placement

Call `await utils.waitWorkflowExecutions()` then `await dbUtils.snapshot()` **after seeding, in
`beforeAll`**. Two reasons:

- A workflow that creates a row and then reads it back can land its write and its read on divergent
  connections after a per-test template restore, so the just-created row is invisible to the next step.
  This surfaces as a MikroORM *"you tried to set relationship id … but such entity does not exist"* on
  a workflow that passes in isolation and fails as a later test. Snapshotting re-captures the template
  and stabilises the connection.
- Snapshotting from inside an `it` body makes fixture state cumulative and the block order-dependent —
  a later test then passes or fails based on what ran before it.

Order matters: snapshot **after** direct-module setup (auth register, `createUserAccountWorkflow`), not
before, or the immediately-following direct call hits a disrupted connection.

### 4. Global registries persist across tests

Plugins that keep process-global registries (`global.Access*`, and anything else a plugin installs on
`globalThis`) are **not** reset between tests automatically.

- Reset what you mutate, in `beforeEach`. Reset the global directly; do not add a `clearX()` export
  that exists only for tests.
- A shared `resetRegistries()` helper rarely covers everything. Check what it misses — resolver maps,
  authenticator maps, and warn-once dedupe sets are the usual gaps — and note in a comment when a
  describe deliberately wipes state for the rest of the file, because the next person appending a
  describe will inherit it.
- Importing a package's `src/api/middlewares.ts` from a test **executes its module body**, which for
  an enforcement plugin can push hundreds of route guards into a global. Only do it inside a describe
  whose `beforeEach` resets them.
- Warn-once dedupe is process-lifetime within a file. A test asserting a warning fires needs the
  relevant bucket re-armed, or it will pass or fail depending on what ran earlier.

### 5. Seeded data collides with test fixtures

Anything a plugin syncs to the database at boot is already there when your test runs. Creating a row
with the same unique key fails on a constraint rather than on your assertion. Use fixture names that
cannot collide with the shipped set — `widget`, `probe`, and similar.

### 6. `src/**/__tests__` sits outside the server tsconfig project

Every package config excludes `**/__tests__/**`, so unit specs need **two** separate things — one for
the editor, one for CI. They are not interchangeable.

**In the editor:** `/// <reference types="jest" />` as the **first line** of the spec, or you get
`Cannot find name 'describe' / 'it' / 'expect'` on every line:

```ts
/// <reference types="jest" />
import { configForLocale } from '../lib/text-search-config'
```

All 40 unit specs carry it; keep it on new ones. A `tsconfig.unit.json` does not help here — tsserver
only ever looks for an ancestor file named `tsconfig.json`, finds the spec excluded from it, and falls
back to an inferred project that does not inherit the base config's `types: ["node", "framework",
"jest"]`. The directive resolves `@types/jest` independently of any project.

**In CI:** a `tsconfig.unit.json` per package, `noEmit`, wired into that package's `typecheck` script:

```json
"typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.unit.json && tsc -p tsconfig.admin.json"
```

Its `include` mirrors the `TEST_TYPE=unit` testMatch exactly, so the project covers precisely what
`yarn test:unit` runs — including the one unit spec that lives under `src/admin`. Only the specs are
listed; tsc pulls in the sources they import. All 9 packages with unit tests have it, covering all 40
specs. Add both the config and the `typecheck` entry when a package gains its first unit test.

Why the exclusion exists at all: `medusa plugin:build` emits straight from `tsconfig.json`'s file list,
and the only paths it drops are the exact path *segments* `integration-tests`, `test`, `unit-tests` and
`src/admin`. `__tests__` matches none of them, so excluding it is the only thing keeping specs out of
`.medusa/server`.

Before `tsconfig.unit.json` existed, nothing checked these files at all — and jest does not close that
gap, because `@swc/jest` strips types without checking them. A unit spec could be type-broken and still
run green, which is exactly what had happened: turning the check on surfaced 26 errors in `access`
alone. See the note below on what they were, because the same shapes will recur.

Three non-fixes that look reasonable and are not:

- **Do not un-exclude `__tests__`.** The specs then get emitted into `.medusa/server` and ship, dragging
  jest and `@medusajs/test-utils` into the published artifact.
- **Do not rename the directory** to `unit-tests` (which the build *does* ignore). `testMatch` is
  `**/src/**/__tests__/**/*.unit.spec.[jt]s`, so jest silently stops finding the suite — and 17 of the
  25 `test:unit` scripts pass `--passWithNoTests`, so in those packages that reads as green.
- **Do not add a `tsconfig.spec.json` project reference.** A referenced project must be `composite`; a
  composite project must list every file in its program, so it has to include the sources the specs
  import; and that overlap makes tsc redirect those shared files to the spec project's never-built
  declaration output, raising `TS6305: Output file … has not been built from source file …` on each.

## What a good test looks like here

- **Assert at the highest seam that can observe the behaviour.** An HTTP request for anything the
  request pipeline decides; a pure-function table only where the input space is large (path resolution)
  or the seam is genuinely internal. Registry internals, resolver call counts and wrapper mechanics are
  asserted only where they *are* the contract.
- **Assert the reason, not just the status.** If a route can return `403` from six different branches,
  a bare `expect(res.status).toBe(403)` does not distinguish "denied because the policy was missing"
  from "denied because auth was absent". Where a test names a specific mechanism, construct the fixture
  so that mechanism is the *only* remaining reason to fail — otherwise the test survives deleting it.
- **Pair every admission with its denial**, at the same floor.
- **A narrowing or filtering assertion must prove the withheld data exists.** Fetch it as a
  fully-privileged actor in the same test; a small result set is not evidence of narrowing.
- **No test-only production code.** No DI props, shims, or casts that exist solely to make a test
  reachable — use `vi.mock`/`jest.mock` instead.

## Per-package notes

- **`packages/access`** — an authorization framework, so the "assert the reason" rule above is load-
  bearing rather than advisory. See [packages/access/AUDIT-ACTIONS.md](packages/access/AUDIT-ACTIONS.md)
  sections B–D for the specific tests that currently do not meet it.

  Turning on `tsconfig.unit.json` (footgun 6) surfaced 26 errors across 6 of its 19 specs. All are
  fixed, and the four shapes are worth recognising because they recur in any spec suite that has never
  been typechecked:

  - **Reading a discriminated union without narrowing.** `AccessDecision` is
    `{granted: false, missing} | {granted: true, scopes}`, and specs read `.missing` straight off it.
    The fix is `assertDenied`/`assertGranted` in `authorize.unit.spec.ts` — `asserts decision is
    Extract<…>` helpers that assert the branch *and* narrow to it. Prefer them over the two idioms they
    replaced: `if (!decision.granted) { expect(...) }` silently skips the assertions it wraps when the
    decision is the other branch, and `(decision as any).scopes` asserts nothing at all.
  - **Untyped mocks.** `jest.fn(async () => …)` infers a zero-length argument tuple, so
    `graph.mock.calls[0][0]` is a type error rather than an assertion. Declare the parameter the
    production path actually passes.
  - **Casting past an API type.** `resolve('query') as { graph: () => … }` was unsound —
    `QueryGraphFunction` requires an argument — and would have survived a signature change it no longer
    matched. Resolve at the real type instead.
  - **Relative `await import()`.** It resolves as ESM under `moduleResolution: node16` and wants a
    `.js` extension jest cannot resolve. Hoist to a static import when the module has no side effects
    worth deferring.
- **`packages/complaints`** — deliberately proves only that access's declarations do not block a
  fully-privileged actor. Denial is a framework guarantee and is proven in access's own suite, not
  re-proven per consumer.
