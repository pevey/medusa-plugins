import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260716182014 extends Migration {

  override async up(): Promise<void> {
    // --- new translation table ---
    this.addSql(`alter table if exists "search_document_translation" drop constraint if exists "search_document_translation_search_document_id_locale_unique";`);
    this.addSql(`create table if not exists "search_document_translation" ("id" text not null, "locale" text not null, "title" text not null, "snippet" text null, "primary_text" text not null, "body_text" text null, "search_document_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "search_document_translation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_document_translation_search_document_id" ON "search_document_translation" ("search_document_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_search_document_translation_deleted_at" ON "search_document_translation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_search_document_translation_search_document_id_locale_unique" ON "search_document_translation" ("search_document_id", "locale") WHERE deleted_at IS NULL;`);

    // deleting a base document prunes its translations
    this.addSql(`alter table if exists "search_document_translation" add constraint "search_document_translation_search_document_id_foreign" foreign key ("search_document_id") references "search_document" ("id") on update cascade on delete cascade;`);

    // translation search columns/indexes (raw — DML has no tsvector type)
    this.addSql(`ALTER TABLE "search_document_translation" ADD COLUMN IF NOT EXISTS "body_tsv" tsvector;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_srtr_primary_trgm" ON "search_document_translation" USING gin ("primary_text" gin_trgm_ops);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_srtr_body_tsv" ON "search_document_translation" USING gin ("body_tsv");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_srtr_locale" ON "search_document_translation" ("locale");`);

    // --- base table: hybrid tsvector lane + weight fix ---
    this.addSql(`alter table if exists "search_document" rename column "secondary_text" to "body_text";`);
    this.addSql(`ALTER TABLE "search_document" ALTER COLUMN "weight" TYPE numeric USING "weight"::numeric;`);
    this.addSql(`ALTER TABLE "search_document" ADD COLUMN IF NOT EXISTS "body_tsv" tsvector;`);
    this.addSql(`DROP INDEX IF EXISTS "idx_search_secondary_trgm";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_search_body_tsv" ON "search_document" USING gin ("body_tsv");`);
    this.addSql(`UPDATE "search_document" SET "body_tsv" = to_tsvector('simple', coalesce("body_text",'')) WHERE "body_tsv" IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_search_body_tsv";`);
    this.addSql(`ALTER TABLE "search_document" DROP COLUMN IF EXISTS "body_tsv";`);
    this.addSql(`ALTER TABLE "search_document" ALTER COLUMN "weight" TYPE integer USING round("weight")::integer;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_search_secondary_trgm" ON "search_document" USING gin ("body_text" gin_trgm_ops);`);
    this.addSql(`alter table if exists "search_document" rename column "body_text" to "secondary_text";`);

    this.addSql(`drop table if exists "search_document_translation" cascade;`);
  }

}
