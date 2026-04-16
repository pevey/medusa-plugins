import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171812 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "order_note" ("id" text not null, "order_id" text not null, "user_id" text not null, "note" text not null, "sent" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_note_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_note_deleted_at" ON "order_note" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_note" cascade;`);
  }

}
