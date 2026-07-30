import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260626034658 extends Migration {
	override async up(): Promise<void> {
		this.addSql(`alter table if exists "complaint" alter column "order_id" type text using ("order_id"::text);`)
		this.addSql(`alter table if exists "complaint" alter column "order_id" drop not null;`)
		this.addSql(`alter table if exists "complaint" alter column "product_id" type text using ("product_id"::text);`)
		this.addSql(`alter table if exists "complaint" alter column "product_id" drop not null;`)
		this.addSql(
			`alter table if exists "complaint" add column if not exists "reportable" boolean not null default false, add column if not exists "actionable" boolean not null default false;`
		)
	}

	override async down(): Promise<void> {
		this.addSql(`alter table if exists "complaint" alter column "order_id" type text using ("order_id"::text);`)
		this.addSql(`alter table if exists "complaint" alter column "order_id" set not null;`)
		this.addSql(`alter table if exists "complaint" alter column "product_id" type text using ("product_id"::text);`)
		this.addSql(`alter table if exists "complaint" alter column "product_id" set not null;`)
		this.addSql(`alter table if exists "complaint" drop column if exists "reportable", drop column if exists "actionable";`)
	}
}
