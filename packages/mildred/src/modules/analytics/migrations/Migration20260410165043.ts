import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260410165043 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "analytics_segment" drop constraint if exists "analytics_segment_name_unique";`);
    this.addSql(`alter table if exists "analytics_rubric" drop constraint if exists "analytics_rubric_name_unique";`);
    this.addSql(`alter table if exists "analytics_identity" drop constraint if exists "analytics_identity_actor_id_unique";`);
    this.addSql(`alter table if exists "analytics_funnel" drop constraint if exists "analytics_funnel_name_unique";`);
    this.addSql(`create table if not exists "analytics_event" ("id" text not null, "event" text not null, "actor_id" text null, "group_type" text null, "group_id" text null, "properties" jsonb null, "session_id" text null, "source" text check ("source" in ('storefront', 'backend')) not null default 'backend', "sales_channel_id" text null, "timestamp" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_event_deleted_at" ON "analytics_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "analytics_event_daily" ("id" text not null, "event" text not null, "date" timestamptz not null, "sales_channel_id" text null, "count" integer not null default 0, "unique_actors" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_event_daily_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_event_daily_deleted_at" ON "analytics_event_daily" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "analytics_funnel" ("id" text not null, "name" text not null, "label" text not null, "description" text null, "steps" jsonb not null, "sales_channel_id" text null, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_funnel_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_analytics_funnel_name_unique" ON "analytics_funnel" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_funnel_deleted_at" ON "analytics_funnel" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "analytics_identity" ("id" text not null, "actor_id" text not null, "customer_id" text null, "anonymous_ids" jsonb not null default '[]', "properties" jsonb null, "last_seen_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_identity_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_analytics_identity_actor_id_unique" ON "analytics_identity" ("actor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_identity_deleted_at" ON "analytics_identity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "analytics_rubric" ("id" text not null, "name" text not null, "label" text not null, "description" text null, "expected_properties" jsonb null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_rubric_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_analytics_rubric_name_unique" ON "analytics_rubric" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_rubric_deleted_at" ON "analytics_rubric" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "analytics_segment" ("id" text not null, "name" text not null, "label" text not null, "description" text null, "rules" jsonb not null, "sales_channel_id" text null, "created_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_segment_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_analytics_segment_name_unique" ON "analytics_segment" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_segment_deleted_at" ON "analytics_segment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "analytics_segment_membership" ("id" text not null, "segment_id" text not null, "actor_id" text not null, "evaluated_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_segment_membership_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_segment_membership_deleted_at" ON "analytics_segment_membership" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "analytics_event" cascade;`);

    this.addSql(`drop table if exists "analytics_event_daily" cascade;`);

    this.addSql(`drop table if exists "analytics_funnel" cascade;`);

    this.addSql(`drop table if exists "analytics_identity" cascade;`);

    this.addSql(`drop table if exists "analytics_rubric" cascade;`);

    this.addSql(`drop table if exists "analytics_segment" cascade;`);

    this.addSql(`drop table if exists "analytics_segment_membership" cascade;`);
  }

}
