import type { LoaderOptions } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

export default async function seedIfEmptyLoader({ container }: LoaderOptions) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER) ?? console

	const workerMode = process.env.WORKER_MODE || 'shared'
	if (workerMode === 'server') return

	// Loader containers do NOT have the module's own service or `query` registered yet —
	// the service is instantiated AFTER loaders run. So we can't call the reindex workflow
	// from here. Instead: check for existing rows via the raw pg connection, then emit an
	// event that a subscriber picks up (subscribers get the full app container).
	const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION, { allowUnregistered: true })
	if (!knex) return

	let hasDocuments = false
	try {
		const [{ exists }] = await knex.raw(
			`SELECT EXISTS (SELECT 1 FROM search_document WHERE deleted_at IS NULL LIMIT 1) AS exists`
		).then((r: { rows: { exists: boolean }[] }) => r.rows)
		hasDocuments = exists
	} catch (error) {
		// Table may not exist yet (fresh install before migrations); nothing to seed.
		logger.debug?.(`[search] seed check skipped: ${(error as Error).message}`)
		return
	}

	if (hasDocuments) return

	const eventBus = container.resolve(Modules.EVENT_BUS, { allowUnregistered: true })
	if (!eventBus) {
		logger.warn('[search] cannot seed on startup — event bus module is not configured')
		return
	}

	// Defer emit until after boot completes so subscribers are registered and ready.
	setImmediate(() => {
		eventBus
			.emit({ name: 'search.seed-empty-index', data: {} })
			.catch((error: Error) => {
				logger.error(`[search] failed to emit initial-seed event: ${error.message}`)
			})
	})
}
