import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713063739 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "search_document" drop constraint if exists "search_document_type_entity_id_unique";`);
    this.addSql(`create table if not exists "search_document" ("id" text not null, "type" text not null, "entity_id" text not null, "slug" text not null, "group_slug" text null, "title" text not null, "snippet" text null, "primary_text" text not null, "secondary_text" text null, "weight" integer not null default 1, "sales_channel_ids" text[] null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "search_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_document_deleted_at" ON "search_document" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_search_document_type_entity_id_unique" ON "search_document" ("type", "entity_id") WHERE deleted_at IS NULL;`);

    // pg_trgm typo-tolerant search support
    this.addSql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_search_primary_trgm" ON "search_document" USING gin ("primary_text" gin_trgm_ops);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_search_secondary_trgm" ON "search_document" USING gin ("secondary_text" gin_trgm_ops);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_search_channels" ON "search_document" USING gin ("sales_channel_ids");`);
  }

  override async down(): Promise<void> {
    // Note: the pg_trgm extension is intentionally not dropped — other features may rely on it.
    this.addSql(`DROP INDEX IF EXISTS "idx_search_channels";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_search_secondary_trgm";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_search_primary_trgm";`);
    this.addSql(`drop table if exists "search_document" cascade;`);
  }

}
