import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260508120000 extends Migration {
	override async up(): Promise<void> {
		// 1. Drop the existing unique constraint/index on order_id
		this.addSql(
			`alter table if exists "veeqo_order" drop constraint if exists "veeqo_order_order_id_unique";`
		)
		this.addSql(`drop index if exists "IDX_veeqo_order_order_id_unique";`)

		// 2. Add source_type with default for backfill
		this.addSql(
			`alter table "veeqo_order" add column "source_type" text check ("source_type" in ('order_placed', 'claim', 'exchange')) not null default 'order_placed';`
		)

		// 3. Add source_id nullable initially
		this.addSql(`alter table "veeqo_order" add column "source_id" text;`)

		// 4. Backfill source_id from order_id (every existing row was an original placement)
		this.addSql(`update "veeqo_order" set "source_id" = "order_id";`)

		// 5. Lock down source_id
		this.addSql(`alter table "veeqo_order" alter column "source_id" set not null;`)

		// 6. New uniqueness invariant: one VeeqoOrder per (source_type, source_id)
		this.addSql(
			`create unique index "IDX_veeqo_order_source_uniq" on "veeqo_order" ("source_type", "source_id") where deleted_at is null;`
		)

		// 7. Make veeqo_order_id nullable for the placeholder-row pattern.
		//    Postgres allows multiple NULLs in a unique index, so existing uniqueness invariant
		//    on populated values is preserved.
		this.addSql(
			`alter table "veeqo_order" alter column "veeqo_order_id" drop not null;`
		)

		// 8/9. Failure-tracking columns
		this.addSql(`alter table "veeqo_order" add column "last_sync_error" text null;`)
		this.addSql(
			`alter table "veeqo_order" add column "last_sync_attempted_at" timestamptz null;`
		)
	}

	override async down(): Promise<void> {
		throw new Error(
			'No down migration: replacement support changed VeeqoOrder from 1:1 to 1:N. ' +
				'Roll back by restoring a database backup from before this migration.'
		)
	}
}
