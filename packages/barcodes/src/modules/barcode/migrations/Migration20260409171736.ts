import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171736 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "barcode" ("id" text not null, "url" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "barcode_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_barcode_deleted_at" ON "barcode" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "barcode" cascade;`);
  }

}
