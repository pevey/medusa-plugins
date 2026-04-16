import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171930 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "automation_query" drop constraint if exists "automation_query_action_id_unique";`);
    this.addSql(`create table if not exists "automation_secret" ("id" text not null, "label" text not null, "secret" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_secret_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_secret_deleted_at" ON "automation_secret" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "automation_trigger" ("id" text not null, "name" text not null, "description" text null, "is_active" boolean not null default true, "trigger_type" text check ("trigger_type" in ('medusa_event', 'incoming_webhook')) not null, "trigger_events" jsonb null, "trigger_signing_key" text null, "log_incoming" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_trigger_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_trigger_deleted_at" ON "automation_trigger" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "automation_receipt" ("id" text not null, "trigger_id" text not null, "request_ip" text null, "payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_receipt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_receipt_trigger_id" ON "automation_receipt" ("trigger_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_receipt_deleted_at" ON "automation_receipt" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "automation_action" ("id" text not null, "name" text not null, "description" text null, "is_active" boolean not null default true, "trigger_id" text not null, "action_type" text check ("action_type" in ('outgoing_webhook', 'outgoing_request', 'medusa_workflow')) not null, "target_url" text null, "signing_secret_id" text null, "request_method" text null, "target_headers" jsonb null, "medusa_workflow" text null, "field_mappings" jsonb null, "static_values" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_action_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_action_trigger_id" ON "automation_action" ("trigger_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_action_deleted_at" ON "automation_action" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "automation_query" ("id" text not null, "action_id" text not null, "entity_name" text not null, "fields" jsonb null, "filters" jsonb null, "limit" integer not null default 10, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_query_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_automation_query_action_id_unique" ON "automation_query" ("action_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_query_deleted_at" ON "automation_query" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "automation_delivery" ("id" text not null, "event_name" text not null, "request_payload" jsonb null, "response_status" integer null, "response_body" text null, "status" text check ("status" in ('pending', 'success', 'failed')) not null default 'pending', "attempts" integer not null default 0, "error_message" text null, "action_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "automation_delivery_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_delivery_action_id" ON "automation_delivery" ("action_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_automation_delivery_deleted_at" ON "automation_delivery" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "automation_receipt" drop constraint if exists "automation_receipt_trigger_id_foreign";`);
    this.addSql(`alter table if exists "automation_receipt" add constraint "automation_receipt_trigger_id_foreign" foreign key ("trigger_id") references "automation_trigger" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "automation_action" drop constraint if exists "automation_action_trigger_id_foreign";`);
    this.addSql(`alter table if exists "automation_action" add constraint "automation_action_trigger_id_foreign" foreign key ("trigger_id") references "automation_trigger" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "automation_query" drop constraint if exists "automation_query_action_id_foreign";`);
    this.addSql(`alter table if exists "automation_query" add constraint "automation_query_action_id_foreign" foreign key ("action_id") references "automation_action" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "automation_delivery" drop constraint if exists "automation_delivery_action_id_foreign";`);
    this.addSql(`alter table if exists "automation_delivery" add constraint "automation_delivery_action_id_foreign" foreign key ("action_id") references "automation_action" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "automation_receipt" drop constraint if exists "automation_receipt_trigger_id_foreign";`);

    this.addSql(`alter table if exists "automation_action" drop constraint if exists "automation_action_trigger_id_foreign";`);

    this.addSql(`alter table if exists "automation_query" drop constraint if exists "automation_query_action_id_foreign";`);

    this.addSql(`alter table if exists "automation_delivery" drop constraint if exists "automation_delivery_action_id_foreign";`);

    this.addSql(`drop table if exists "automation_secret" cascade;`);

    this.addSql(`drop table if exists "automation_trigger" cascade;`);

    this.addSql(`drop table if exists "automation_receipt" cascade;`);

    this.addSql(`drop table if exists "automation_action" cascade;`);

    this.addSql(`drop table if exists "automation_query" cascade;`);

    this.addSql(`drop table if exists "automation_delivery" cascade;`);
  }

}
