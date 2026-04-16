import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171742 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "complaint" ("id" text not null, "number" serial, "status" text check ("status" in ('open', 'closed')) not null default 'open', "description" text not null, "customer_id" text not null, "order_id" text not null, "product_id" text not null, "serial_number_id" text null, "stock_lot_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "complaint_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_deleted_at" ON "complaint" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "complaint_activity" ("id" text not null, "type" text check ("type" in ('open', 'close', 'note')) not null default 'note', "user_id" text not null, "note" text null, "metadata" jsonb null, "complaint_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "complaint_activity_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_activity_complaint_id" ON "complaint_activity" ("complaint_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_activity_deleted_at" ON "complaint_activity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "complaint_product_stat" ("id" text not null, "product_id" text not null, "total_orders" integer not null default 0, "total_complaints" integer not null default 0, "complaint_rate" real not null default 0, "last_calculated_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "complaint_product_stat_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_product_stat_deleted_at" ON "complaint_product_stat" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "complaint_tag" ("id" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "complaint_tag_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_tag_deleted_at" ON "complaint_tag" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "complaint_complaint_tags" ("complaint_id" text not null, "complaint_tag_id" text not null, constraint "complaint_complaint_tags_pkey" primary key ("complaint_id", "complaint_tag_id"));`);

    this.addSql(`alter table if exists "complaint_activity" drop constraint if exists "complaint_activity_complaint_id_foreign";`);
    this.addSql(`alter table if exists "complaint_activity" add constraint "complaint_activity_complaint_id_foreign" foreign key ("complaint_id") references "complaint" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "complaint_complaint_tags" drop constraint if exists "complaint_complaint_tags_complaint_id_foreign";`);
    this.addSql(`alter table if exists "complaint_complaint_tags" add constraint "complaint_complaint_tags_complaint_id_foreign" foreign key ("complaint_id") references "complaint" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "complaint_complaint_tags" drop constraint if exists "complaint_complaint_tags_complaint_tag_id_foreign";`);
    this.addSql(`alter table if exists "complaint_complaint_tags" add constraint "complaint_complaint_tags_complaint_tag_id_foreign" foreign key ("complaint_tag_id") references "complaint_tag" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "complaint_activity" drop constraint if exists "complaint_activity_complaint_id_foreign";`);

    this.addSql(`alter table if exists "complaint_complaint_tags" drop constraint if exists "complaint_complaint_tags_complaint_id_foreign";`);

    this.addSql(`alter table if exists "complaint_complaint_tags" drop constraint if exists "complaint_complaint_tags_complaint_tag_id_foreign";`);

    this.addSql(`drop table if exists "complaint" cascade;`);

    this.addSql(`drop table if exists "complaint_activity" cascade;`);

    this.addSql(`drop table if exists "complaint_product_stat" cascade;`);

    this.addSql(`drop table if exists "complaint_tag" cascade;`);

    this.addSql(`drop table if exists "complaint_complaint_tags" cascade;`);
  }

}
