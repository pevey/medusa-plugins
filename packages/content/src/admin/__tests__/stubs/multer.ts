// Browser-test stand-in for the `multer` package, aliased in by `vitest.config.ts`. The real
// package is Node-only (streams, temp-file/memory storage) and crashes when Vite tries to bundle
// it for the browser test environment. `src/api/middlewares.ts` only references it to build the
// inline upload middleware for `POST /admin/content/:collectionId/upload` -- a plain function
// placed in a route's `middlewares` array and never invoked by contract validation, which only
// ever reads the `__kind`/`__schema`/`__queryConfig` tags `validateAndTransformQuery`/`Body`
// attach to the OTHER middleware entries. This stub reproduces just enough of multer's shape
// (`multer(opts).single()/.array()` returning a callable, `multer.memoryStorage()`) for
// `middlewares.ts` to import and call it without error; the returned middleware is never executed.
type NoopMiddleware = (req: unknown, res: unknown, next: () => void) => void

function multer(_opts?: unknown) {
	const noop: NoopMiddleware = (_req, _res, next) => next?.()
	return {
		single: (_field?: string) => noop,
		array: (_field?: string) => noop
	}
}
multer.memoryStorage = () => ({})

export default multer
