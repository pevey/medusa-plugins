import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { BOOTSTRAP_SUPER_ADMIN_EVENT, bootstrapSuperAdminWorkflow } from '../workflows/access/workflows/bootstrap-super-admin'

/**
 * First-load bootstrap of the seeded super-admin role. The access module's
 * `onApplicationStart` hook emits `access.bootstrap-super-admin`; this subscriber
 * receives the full app container (so the workflow's steps can resolve
 * `query`/`link`) and runs the workflow, which is idempotent — it grants
 * super-admin to every existing user only when no user↔role link exists yet.
 */
export default async function accessBootstrapHandler({ container }: SubscriberArgs<Record<string, never>>) {
	const logger = container.resolve('logger')

	try {
		await bootstrapSuperAdminWorkflow(container).run({})
	} catch (error) {
		logger.error(`[access] super-admin bootstrap failed: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: [BOOTSTRAP_SUPER_ADMIN_EVENT]
}
