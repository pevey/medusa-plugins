import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171754 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "customer_tag" ("id" text not null, "value" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_tag_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_tag_deleted_at" ON "customer_tag" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_tag" cascade;`);
  }

}
