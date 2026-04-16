import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171919 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "invalidation_reason" ("id" text not null, "value" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invalidation_reason_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invalidation_reason_deleted_at" ON "invalidation_reason" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "stock_lot" ("id" text not null, "inventory_item_id" text not null, "stock_location_id" text not null, "lot_number" text not null, "description" text null, "enabled" boolean not null default true, "initial_quantity" integer not null, "stocked_quantity" integer not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_lot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_lot_deleted_at" ON "stock_lot" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "serial_number" ("id" text not null, "order_id" text not null, "value" text not null, "invalidated" boolean not null default false, "invalidation_reason_id" text null, "stock_lot_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "serial_number_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_serial_number_invalidation_reason_id" ON "serial_number" ("invalidation_reason_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_serial_number_stock_lot_id" ON "serial_number" ("stock_lot_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_serial_number_deleted_at" ON "serial_number" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "serial_number" drop constraint if exists "serial_number_invalidation_reason_id_foreign";`);
    this.addSql(`alter table if exists "serial_number" add constraint "serial_number_invalidation_reason_id_foreign" foreign key ("invalidation_reason_id") references "invalidation_reason" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table if exists "serial_number" drop constraint if exists "serial_number_stock_lot_id_foreign";`);
    this.addSql(`alter table if exists "serial_number" add constraint "serial_number_stock_lot_id_foreign" foreign key ("stock_lot_id") references "stock_lot" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "serial_number" drop constraint if exists "serial_number_invalidation_reason_id_foreign";`);

    this.addSql(`alter table if exists "serial_number" drop constraint if exists "serial_number_stock_lot_id_foreign";`);

    this.addSql(`drop table if exists "invalidation_reason" cascade;`);

    this.addSql(`drop table if exists "stock_lot" cascade;`);

    this.addSql(`drop table if exists "serial_number" cascade;`);
  }

}
