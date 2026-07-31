import { fileURLToPath } from 'node:url'
import { defineAdminTestConfig } from 'medusa-admin-test-utils/config'

// DEVIATES from the plain template: `src/api/validators.ts` imports the `SourceType` enum from
// the plugin's own `src/modules/veeqo/models/veeqo-order.ts`, which does
// `import { model } from '@medusajs/framework/utils'` to define its DML model. That barrel import
// drags in jsonwebtoken/jws (-> util.inherits), which crashes the browser test bundle -- the same
// crash class the admin-test-utils README documents for a route.ts, just reached via validators.ts's
// transitive imports. Contract validation only needs the enum's plain string values, never the DML
// model, so the file is aliased to a browser-safe stub (`src/admin/__tests__/stubs/veeqo-order.ts`).
const stub = (name: string) => fileURLToPath(new URL(`./src/admin/__tests__/stubs/${name}.ts`, import.meta.url))

export default defineAdminTestConfig({
	root: import.meta.dirname,
	alias: [{ find: '../modules/veeqo/models/veeqo-order', replacement: stub('veeqo-order') }]
})
