import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409183947 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review" ("id" text not null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "rating" integer not null, "title" text null, "body" text not null, "author_name" text not null, "author_email" text null, "product_id" text null, "order_id" text null, "customer_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "review_activity" ("id" text not null, "type" text check ("type" in ('submit', 'approve', 'reject', 'note')) not null default 'note', "user_id" text not null, "note" text null, "metadata" jsonb null, "review_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_activity_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_activity_review_id" ON "review_activity" ("review_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_activity_deleted_at" ON "review_activity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "review_activity" drop constraint if exists "review_activity_review_id_foreign";`);
    this.addSql(`alter table if exists "review_activity" add constraint "review_activity_review_id_foreign" foreign key ("review_id") references "review" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "review_activity" drop constraint if exists "review_activity_review_id_foreign";`);

    this.addSql(`drop table if exists "review" cascade;`);

    this.addSql(`drop table if exists "review_activity" cascade;`);
  }

}
