import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260627214310 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table if exists "affiliate_attribution" drop constraint if exists "affiliate_attribution_order_id_unique";`
		)
		this.addSql(
			`create table if not exists "affiliate" ("id" text not null, "name" text not null, "email" text not null, "phone" text null, "currency_code" text null, "status" text check ("status" in ('active', 'restricted', 'inactive')) not null default 'active', "primary_address_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_pkey" primary key ("id"));`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_deleted_at" ON "affiliate" ("deleted_at") WHERE deleted_at IS NULL;`
		)

		this.addSql(
			`create table if not exists "affiliate_address" ("id" text not null, "affiliate_id" text not null, "first_name" text null, "last_name" text null, "company" text null, "address_1" text null, "address_2" text null, "city" text null, "province" text null, "country_code" text null, "postal_code" text null, "phone" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_address_pkey" primary key ("id"));`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_address_affiliate_id" ON "affiliate_address" ("affiliate_id") WHERE deleted_at IS NULL;`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_address_deleted_at" ON "affiliate_address" ("deleted_at") WHERE deleted_at IS NULL;`
		)

		this.addSql(
			`create table if not exists "affiliate_attribution" ("id" text not null, "affiliate_id" text not null, "promotion_id" text not null, "order_id" text not null, "currency_code" text not null, "gross_subtotal" integer not null default 0, "net_subtotal" integer not null default 0, "placed_at" timestamptz not null, "captured_at" timestamptz null, "completed_at" timestamptz null, "voided_at" timestamptz null, "commission_rate" real null, "commission_amount" integer null, "payout_id" text null, "paid_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_attribution_pkey" primary key ("id"));`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_attribution_deleted_at" ON "affiliate_attribution" ("deleted_at") WHERE deleted_at IS NULL;`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_attribution_affiliate_id_completed_at" ON "affiliate_attribution" ("affiliate_id", "completed_at") WHERE deleted_at IS NULL;`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_attribution_affiliate_id_captured_at" ON "affiliate_attribution" ("affiliate_id", "captured_at") WHERE deleted_at IS NULL;`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_attribution_affiliate_id_placed_at" ON "affiliate_attribution" ("affiliate_id", "placed_at") WHERE deleted_at IS NULL;`
		)
		this.addSql(
			`CREATE INDEX IF NOT EXISTS "IDX_affiliate_attribution_affiliate_id_promotion_id" ON "affiliate_attribution" ("affiliate_id", "promotion_id") WHERE deleted_at IS NULL;`
		)
		this.addSql(
			`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_affiliate_attribution_order_id_unique" ON "affiliate_attribution" ("order_id") WHERE deleted_at IS NULL;`
		)

		this.addSql(
			`alter table if exists "affiliate_address" add constraint "affiliate_address_affiliate_id_foreign" foreign key ("affiliate_id") references "affiliate" ("id") on update cascade on delete cascade;`
		)
	}

	override async down(): Promise<void> {
		this.addSql(
			`alter table if exists "affiliate_address" drop constraint if exists "affiliate_address_affiliate_id_foreign";`
		)

		this.addSql(`drop table if exists "affiliate" cascade;`)

		this.addSql(`drop table if exists "affiliate_address" cascade;`)

		this.addSql(`drop table if exists "affiliate_attribution" cascade;`)
	}
}
