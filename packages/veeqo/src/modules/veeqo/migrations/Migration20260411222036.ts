import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260411222036 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "veeqo_warehouse" drop constraint if exists "veeqo_warehouse_veeqo_warehouse_id_unique";`);
    this.addSql(`alter table if exists "veeqo_warehouse" drop constraint if exists "veeqo_warehouse_stock_location_id_unique";`);
    this.addSql(`alter table if exists "veeqo_shipment" drop constraint if exists "veeqo_shipment_veeqo_shipment_id_unique";`);
    this.addSql(`alter table if exists "veeqo_shipment" drop constraint if exists "veeqo_shipment_veeqo_allocation_id_unique";`);
    this.addSql(`alter table if exists "veeqo_sellable" drop constraint if exists "veeqo_sellable_veeqo_sellable_id_unique";`);
    this.addSql(`alter table if exists "veeqo_sellable" drop constraint if exists "veeqo_sellable_product_variant_id_unique";`);
    this.addSql(`alter table if exists "veeqo_product" drop constraint if exists "veeqo_product_veeqo_product_id_unique";`);
    this.addSql(`alter table if exists "veeqo_product" drop constraint if exists "veeqo_product_product_id_unique";`);
    this.addSql(`alter table if exists "veeqo_order" drop constraint if exists "veeqo_order_veeqo_order_id_unique";`);
    this.addSql(`alter table if exists "veeqo_order" drop constraint if exists "veeqo_order_order_id_unique";`);
    this.addSql(`alter table if exists "veeqo_delivery_method" drop constraint if exists "veeqo_delivery_method_veeqo_delivery_method_id_unique";`);
    this.addSql(`alter table if exists "veeqo_delivery_method" drop constraint if exists "veeqo_delivery_method_shipping_option_id_unique";`);
    this.addSql(`alter table if exists "veeqo_customer" drop constraint if exists "veeqo_customer_veeqo_customer_id_unique";`);
    this.addSql(`alter table if exists "veeqo_customer" drop constraint if exists "veeqo_customer_customer_id_unique";`);
    this.addSql(`alter table if exists "veeqo_channel" drop constraint if exists "veeqo_channel_veeqo_channel_id_unique";`);
    this.addSql(`alter table if exists "veeqo_channel" drop constraint if exists "veeqo_channel_sales_channel_id_unique";`);
    this.addSql(`create table if not exists "veeqo_channel" ("id" text not null, "sales_channel_id" text not null, "veeqo_channel_id" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_channel_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_channel_sales_channel_id_unique" ON "veeqo_channel" ("sales_channel_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_channel_veeqo_channel_id_unique" ON "veeqo_channel" ("veeqo_channel_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_channel_deleted_at" ON "veeqo_channel" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_customer" ("id" text not null, "customer_id" text not null, "veeqo_customer_id" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_customer_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_customer_customer_id_unique" ON "veeqo_customer" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_customer_veeqo_customer_id_unique" ON "veeqo_customer" ("veeqo_customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_customer_deleted_at" ON "veeqo_customer" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_delivery_method" ("id" text not null, "shipping_option_id" text not null, "veeqo_delivery_method_id" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_delivery_method_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_delivery_method_shipping_option_id_unique" ON "veeqo_delivery_method" ("shipping_option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_delivery_method_veeqo_delivery_method_id_unique" ON "veeqo_delivery_method" ("veeqo_delivery_method_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_delivery_method_deleted_at" ON "veeqo_delivery_method" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_order" ("id" text not null, "status" text check ("status" in ('open', 'closed')) not null default 'open', "last_synced_at" timestamptz null, "order_id" text not null, "veeqo_order_id" integer not null, "veeqo_status" text null, "veeqo_customer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_order_order_id_unique" ON "veeqo_order" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_order_veeqo_order_id_unique" ON "veeqo_order" ("veeqo_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_order_veeqo_customer_id" ON "veeqo_order" ("veeqo_customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_order_deleted_at" ON "veeqo_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_product" ("id" text not null, "product_id" text not null, "veeqo_product_id" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_product_product_id_unique" ON "veeqo_product" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_product_veeqo_product_id_unique" ON "veeqo_product" ("veeqo_product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_product_deleted_at" ON "veeqo_product" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_sellable" ("id" text not null, "product_variant_id" text not null, "veeqo_sellable_id" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_sellable_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_sellable_product_variant_id_unique" ON "veeqo_sellable" ("product_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_sellable_veeqo_sellable_id_unique" ON "veeqo_sellable" ("veeqo_sellable_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_sellable_deleted_at" ON "veeqo_sellable" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_shipment" ("id" text not null, "fulfillment_id" text not null, "veeqo_allocation_id" integer not null, "veeqo_shipment_id" integer not null, "carrier" jsonb null, "tracking_number" jsonb null, "shipped_by" jsonb null, "shipped_at" timestamptz null, "veeqo_tracking_events" jsonb null, "veeqo_order_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_shipment_veeqo_allocation_id_unique" ON "veeqo_shipment" ("veeqo_allocation_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_shipment_veeqo_shipment_id_unique" ON "veeqo_shipment" ("veeqo_shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_shipment_veeqo_order_id" ON "veeqo_shipment" ("veeqo_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_shipment_deleted_at" ON "veeqo_shipment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "veeqo_warehouse" ("id" text not null, "stock_location_id" text not null, "veeqo_warehouse_id" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "veeqo_warehouse_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_warehouse_stock_location_id_unique" ON "veeqo_warehouse" ("stock_location_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_veeqo_warehouse_veeqo_warehouse_id_unique" ON "veeqo_warehouse" ("veeqo_warehouse_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_veeqo_warehouse_deleted_at" ON "veeqo_warehouse" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "veeqo_order" drop constraint if exists "veeqo_order_veeqo_customer_id_foreign";`);
    this.addSql(`alter table if exists "veeqo_order" add constraint "veeqo_order_veeqo_customer_id_foreign" foreign key ("veeqo_customer_id") references "veeqo_customer" ("id") on update cascade;`);

    this.addSql(`alter table if exists "veeqo_shipment" drop constraint if exists "veeqo_shipment_veeqo_order_id_foreign";`);
    this.addSql(`alter table if exists "veeqo_shipment" add constraint "veeqo_shipment_veeqo_order_id_foreign" foreign key ("veeqo_order_id") references "veeqo_order" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "veeqo_order" drop constraint if exists "veeqo_order_veeqo_customer_id_foreign";`);

    this.addSql(`alter table if exists "veeqo_shipment" drop constraint if exists "veeqo_shipment_veeqo_order_id_foreign";`);

    this.addSql(`drop table if exists "veeqo_channel" cascade;`);

    this.addSql(`drop table if exists "veeqo_customer" cascade;`);

    this.addSql(`drop table if exists "veeqo_delivery_method" cascade;`);

    this.addSql(`drop table if exists "veeqo_order" cascade;`);

    this.addSql(`drop table if exists "veeqo_product" cascade;`);

    this.addSql(`drop table if exists "veeqo_sellable" cascade;`);

    this.addSql(`drop table if exists "veeqo_shipment" cascade;`);

    this.addSql(`drop table if exists "veeqo_warehouse" cascade;`);
  }

}
