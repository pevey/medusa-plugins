import { fileURLToPath } from 'node:url'
import { defineAdminTestConfig } from 'medusa-admin-test-utils/config'

// DEVIATES from the plain template: `src/api/validators.ts` imports `ComplaintStatus` /
// `ComplaintActivityType` from the plugin's own model files
// (`src/modules/complaint/models/complaint.ts` / `complaint-activity.ts`), and those files do
// `import { model } from '@medusajs/framework/utils'` to define their DML models. That barrel
// import drags in jsonwebtoken/jws (-> util.inherits), which crashes the browser test bundle --
// the same crash class the admin-test-utils README documents for a route.ts, just reached via
// validators.ts's own transitive imports instead of middlewares.ts. Contract validation only
// needs the two enums' plain string values, never the DML model, so both files are aliased to
// browser-safe stubs (`src/admin/__tests__/stubs/`) that re-declare just the enum.
const stub = (name: string) => fileURLToPath(new URL(`./src/admin/__tests__/stubs/${name}.ts`, import.meta.url))

export default defineAdminTestConfig({
	root: import.meta.dirname,
	alias: [
		{ find: '../modules/complaint/models/complaint', replacement: stub('complaint') },
		{ find: '../modules/complaint/models/complaint-activity', replacement: stub('complaint-activity') }
	]
})
