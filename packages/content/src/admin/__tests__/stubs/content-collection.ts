// Browser-test stand-in for `../../modules/content/models/content-collection.ts`, aliased in by
// `vitest.config.ts`. `validators.ts` only needs the plain `ContentFormat` enum, but the real
// file's `import { model } from '@medusajs/framework/utils'` (for the DML model definition) drags
// in jsonwebtoken/jws (-> util.inherits), which crashes the browser test bundle -- the same crash
// class the admin-test-utils README documents for a route.ts. This stub mirrors just the enum.
export enum ContentFormat {
	HTML = 'html',
	IMG = 'img',
	JSON = 'json',
	MD = 'md',
	TEXT = 'text'
}
