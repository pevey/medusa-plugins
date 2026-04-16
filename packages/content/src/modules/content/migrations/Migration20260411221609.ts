import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260411221609 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_collection" drop constraint if exists "content_collection_slug_unique";`);
    this.addSql(`create table if not exists "content_collection" ("id" text not null, "label" text not null, "slug" text not null, "format" text check ("format" in ('html', 'img', 'json', 'md', 'text')) not null, "prefix" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_collection_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_collection_slug_unique" ON "content_collection" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_collection_deleted_at" ON "content_collection" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_creator" ("id" text not null, "name" text not null, "bio" text null, "avatar_url" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_creator_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_creator_deleted_at" ON "content_creator" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_creator_activity" ("id" text not null, "type" text check ("type" in ('edit', 'note')) not null default 'note', "user_id" text not null, "note" text null, "metadata" jsonb null, "creator_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_creator_activity_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_creator_activity_creator_id" ON "content_creator_activity" ("creator_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_creator_activity_deleted_at" ON "content_creator_activity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_field" ("id" text not null, "name" text not null, "label" text not null, "field_type" text not null, "required" boolean not null default false, "options" jsonb null, "default_value" jsonb null, "sort_order" integer not null default 0, "content_collection_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_field_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_field_content_collection_id" ON "content_field" ("content_collection_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_field_deleted_at" ON "content_field" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_item" ("id" text not null, "title" text not null, "slug" text not null, "body" text null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "published_at" timestamptz null, "metadata" jsonb null, "content_collection_id" text not null, "creator_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_item_content_collection_id" ON "content_item" ("content_collection_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_item_creator_id" ON "content_item" ("creator_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_item_deleted_at" ON "content_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_item_activity" ("id" text not null, "type" text check ("type" in ('publish', 'archive', 'draft', 'edit', 'note')) not null default 'note', "user_id" text not null, "note" text null, "metadata" jsonb null, "item_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_item_activity_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_item_activity_item_id" ON "content_item_activity" ("item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_item_activity_deleted_at" ON "content_item_activity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_relationship" ("id" text not null, "relationship_type" text check ("relationship_type" in ('many_to_many', 'one_to_many', 'many_to_one')) not null, "source_collection_id" text not null, "target_collection_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_relationship_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_relationship_source_collection_id" ON "content_relationship" ("source_collection_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_relationship_target_collection_id" ON "content_relationship" ("target_collection_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_relationship_deleted_at" ON "content_relationship" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_link" ("id" text not null, "source_item_id" text not null, "target_item_id" text not null, "relationship_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_link_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_link_source_item_id" ON "content_link" ("source_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_link_target_item_id" ON "content_link" ("target_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_link_relationship_id" ON "content_link" ("relationship_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_link_deleted_at" ON "content_link" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_tag" ("id" text not null, "value" text not null, "metadata" jsonb null, "item_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_tag_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_tag_item_id" ON "content_tag" ("item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_tag_deleted_at" ON "content_tag" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "customer_activity" ("id" text not null, "type" text check ("type" in ('post_view', 'search', 'add_to_cart', 'remove_from_cart', 'order_placed', 'order_canceled', 'order_returned')) not null, "user_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_activity_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_activity_deleted_at" ON "customer_activity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "content_creator_activity" drop constraint if exists "content_creator_activity_creator_id_foreign";`);
    this.addSql(`alter table if exists "content_creator_activity" add constraint "content_creator_activity_creator_id_foreign" foreign key ("creator_id") references "content_creator" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "content_field" drop constraint if exists "content_field_content_collection_id_foreign";`);
    this.addSql(`alter table if exists "content_field" add constraint "content_field_content_collection_id_foreign" foreign key ("content_collection_id") references "content_collection" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "content_item" drop constraint if exists "content_item_content_collection_id_foreign";`);
    this.addSql(`alter table if exists "content_item" add constraint "content_item_content_collection_id_foreign" foreign key ("content_collection_id") references "content_collection" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "content_item" drop constraint if exists "content_item_creator_id_foreign";`);
    this.addSql(`alter table if exists "content_item" add constraint "content_item_creator_id_foreign" foreign key ("creator_id") references "content_creator" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "content_item_activity" drop constraint if exists "content_item_activity_item_id_foreign";`);
    this.addSql(`alter table if exists "content_item_activity" add constraint "content_item_activity_item_id_foreign" foreign key ("item_id") references "content_item" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "content_relationship" drop constraint if exists "content_relationship_source_collection_id_foreign";`);
    this.addSql(`alter table if exists "content_relationship" add constraint "content_relationship_source_collection_id_foreign" foreign key ("source_collection_id") references "content_collection" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "content_relationship" drop constraint if exists "content_relationship_target_collection_id_foreign";`);
    this.addSql(`alter table if exists "content_relationship" add constraint "content_relationship_target_collection_id_foreign" foreign key ("target_collection_id") references "content_collection" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "content_link" drop constraint if exists "content_link_source_item_id_foreign";`);
    this.addSql(`alter table if exists "content_link" add constraint "content_link_source_item_id_foreign" foreign key ("source_item_id") references "content_item" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "content_link" drop constraint if exists "content_link_target_item_id_foreign";`);
    this.addSql(`alter table if exists "content_link" add constraint "content_link_target_item_id_foreign" foreign key ("target_item_id") references "content_item" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "content_link" drop constraint if exists "content_link_relationship_id_foreign";`);
    this.addSql(`alter table if exists "content_link" add constraint "content_link_relationship_id_foreign" foreign key ("relationship_id") references "content_relationship" ("id") on update cascade;`);

    this.addSql(`alter table if exists "content_tag" drop constraint if exists "content_tag_item_id_foreign";`);
    this.addSql(`alter table if exists "content_tag" add constraint "content_tag_item_id_foreign" foreign key ("item_id") references "content_item" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "content_field" drop constraint if exists "content_field_content_collection_id_foreign";`);

    this.addSql(`alter table if exists "content_item" drop constraint if exists "content_item_content_collection_id_foreign";`);

    this.addSql(`alter table if exists "content_relationship" drop constraint if exists "content_relationship_source_collection_id_foreign";`);

    this.addSql(`alter table if exists "content_relationship" drop constraint if exists "content_relationship_target_collection_id_foreign";`);

    this.addSql(`alter table if exists "content_creator_activity" drop constraint if exists "content_creator_activity_creator_id_foreign";`);

    this.addSql(`alter table if exists "content_item" drop constraint if exists "content_item_creator_id_foreign";`);

    this.addSql(`alter table if exists "content_item_activity" drop constraint if exists "content_item_activity_item_id_foreign";`);

    this.addSql(`alter table if exists "content_link" drop constraint if exists "content_link_source_item_id_foreign";`);

    this.addSql(`alter table if exists "content_link" drop constraint if exists "content_link_target_item_id_foreign";`);

    this.addSql(`alter table if exists "content_tag" drop constraint if exists "content_tag_item_id_foreign";`);

    this.addSql(`alter table if exists "content_link" drop constraint if exists "content_link_relationship_id_foreign";`);

    this.addSql(`drop table if exists "content_collection" cascade;`);

    this.addSql(`drop table if exists "content_creator" cascade;`);

    this.addSql(`drop table if exists "content_creator_activity" cascade;`);

    this.addSql(`drop table if exists "content_field" cascade;`);

    this.addSql(`drop table if exists "content_item" cascade;`);

    this.addSql(`drop table if exists "content_item_activity" cascade;`);

    this.addSql(`drop table if exists "content_relationship" cascade;`);

    this.addSql(`drop table if exists "content_link" cascade;`);

    this.addSql(`drop table if exists "content_tag" cascade;`);

    this.addSql(`drop table if exists "customer_activity" cascade;`);
  }

}
