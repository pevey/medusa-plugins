import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171831 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "statistics_daily" ("id" text not null, "date" timestamptz not null, "revenue_total" real not null default 0, "order_count" integer not null default 0, "average_order_value" real not null default 0, "new_customer_count" integer not null default 0, "returning_customer_count" integer not null default 0, "pending_fulfillment_count" integer not null default 0, "low_stock_count" integer not null default 0, "top_products" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_daily_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_daily_deleted_at" ON "statistics_daily" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "statistics_daily" cascade;`);
  }

}
