import { Migration } from '@medusajs/framework/mikro-orm/migrations'

/**
 * Expression index on the identity's `country` trait (stored in the `properties`
 * JSONB) so funnel geo drill-downs — "% drop-off in DE" — filter efficiently
 * without promoting country to a dedicated column.
 */
export class Migration20260715120000 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_analytics_identity_country" ON "analytics_identity" ((properties->>'country')) WHERE deleted_at IS NULL;`
		)
	}

	override async down(): Promise<void> {
		this.addSql(`DROP INDEX IF EXISTS "IDX_analytics_identity_country";`)
	}
}
