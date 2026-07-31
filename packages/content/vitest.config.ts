import { fileURLToPath } from 'node:url'
import { defineAdminTestConfig } from 'medusa-admin-test-utils/config'

// DEVIATES from the plain template with a plugin-scoped `alias` list, for two independent reasons:
//
// 1. `src/api/validators.ts` imports enums (`ContentFormat`, `ContentStatus`,
//    `ContentRelationshipType`, `ContentCreatorActivityType`, `ContentItemActivityType`) from the
//    plugin's own model files under `src/modules/content/models/`. Those files do
//    `import { model } from '@medusajs/framework/utils'` to define their DML models, and that
//    barrel import drags in jsonwebtoken/jws (-> util.inherits), which crashes the browser test
//    bundle -- the same crash class the admin-test-utils README documents for a route.ts, just
//    reached via validators.ts's transitive imports. Contract validation only needs the five
//    enums' plain string values, never the DML models, so all five files are aliased to
//    browser-safe stubs (`src/admin/__tests__/stubs/`) that re-declare just the enum.
// 2. `src/api/middlewares.ts` imports `multer` directly (for the file-upload route's inline
//    middleware) -- Node-only, and it crashes the same way. Aliased to a stub that reproduces just
//    the `multer(opts).single()/.array()` / `multer.memoryStorage()` shape middlewares.ts calls;
//    the returned middleware function is placed in a route's `middlewares` array but never invoked
//    by contract validation, which only reads the OTHER entries' `__kind`/`__schema` tags.
//
// With both aliased, `middlewares.ts` imports cleanly for real -- no need to hand-mirror the route
// list the way complaints' setup.ts does (that plugin's crash came from an unconditional
// `require('medusa-plugin-access')` at the top of middlewares.ts itself, which has no alias-based
// fix; content has no such call).
const stub = (name: string) => fileURLToPath(new URL(`./src/admin/__tests__/stubs/${name}.ts`, import.meta.url))

export default defineAdminTestConfig({
	root: import.meta.dirname,
	alias: [
		{ find: '../modules/content/models/content-collection', replacement: stub('content-collection') },
		{ find: '../modules/content/models/content-item', replacement: stub('content-item') },
		{ find: '../modules/content/models/content-relationship', replacement: stub('content-relationship') },
		{ find: '../modules/content/models/content-creator-activity', replacement: stub('content-creator-activity') },
		{ find: '../modules/content/models/content-item-activity', replacement: stub('content-item-activity') },
		{ find: 'multer', replacement: stub('multer') }
	]
})
