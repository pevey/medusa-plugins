import { fileURLToPath } from 'node:url'
import { defineAdminTestConfig } from 'medusa-admin-test-utils/config'

// DEVIATES from the plain template with a plugin-scoped `alias` list: `src/api/validators.ts`
// imports enums (`AutomationTriggerType`, `AutomationActionType`, `AutomationRequestMethod`,
// `AutomationDeliveryStatus`) from the plugin's own model files under
// `src/modules/automation/models/`. Those files do `import { model } from '@medusajs/framework/utils'`
// to define their DML models, and that barrel import drags in jsonwebtoken/jws (-> util.inherits),
// which crashes the browser test bundle -- the same crash class the admin-test-utils README
// documents for a route.ts, just reached via validators.ts's transitive imports. Contract
// validation only needs the four enums' plain string values, never the DML models, so all three
// files are aliased to browser-safe stubs (`src/admin/__tests__/stubs/`) that re-declare just the
// enums (`automation-action.ts` supplies two).
//
// `src/api/middlewares.ts` itself imports only `@medusajs/framework/http` (already aliased by the
// shared config) and `./validators`, so once the three model files are aliased it imports cleanly
// for real -- no need to hand-mirror the route list the way complaints'/access's setup.ts does.
//
// One more wrinkle `alias` can't fix: the `/webhooks/:id` route's `bodyParser.sizeLimit` reads
// `process.env.MAX_WEBHOOK_PAYLOAD_SIZE` directly, inline in `middlewares.ts` -- not through an
// importable module, so there is nothing to alias. The browser test environment has no `process`
// global at all, so this throws `ReferenceError: process is not defined` at import time. Uses the
// harness's `define` option (added for this case) to replace the whole expression with `undefined`
// at build time, which falls through to the route's own `|| '512kb'` default -- exactly the value
// production gets when the env var is unset.
const stub = (name: string) => fileURLToPath(new URL(`./src/admin/__tests__/stubs/${name}.ts`, import.meta.url))

export default defineAdminTestConfig({
	root: import.meta.dirname,
	alias: [
		{ find: '../modules/automation/models/automation-trigger', replacement: stub('automation-trigger') },
		{ find: '../modules/automation/models/automation-action', replacement: stub('automation-action') },
		{ find: '../modules/automation/models/automation-delivery', replacement: stub('automation-delivery') }
	],
	define: {
		'process.env.MAX_WEBHOOK_PAYLOAD_SIZE': 'undefined'
	}
})
