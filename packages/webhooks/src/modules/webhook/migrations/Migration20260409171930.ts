import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171930 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "webhook_query" drop constraint if exists "webhook_query_action_id_unique";`);
    this.addSql(`create table if not exists "webhook_secret" ("id" text not null, "label" text not null, "secret" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_secret_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_secret_deleted_at" ON "webhook_secret" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_trigger" ("id" text not null, "name" text not null, "description" text null, "is_active" boolean not null default true, "trigger_type" text check ("trigger_type" in ('medusa_event', 'incoming_webhook')) not null, "trigger_events" jsonb null, "trigger_signing_key" text null, "log_incoming" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_trigger_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_trigger_deleted_at" ON "webhook_trigger" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_receipt" ("id" text not null, "trigger_id" text not null, "request_ip" text null, "payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_receipt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_receipt_trigger_id" ON "webhook_receipt" ("trigger_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_receipt_deleted_at" ON "webhook_receipt" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_action" ("id" text not null, "name" text not null, "description" text null, "is_active" boolean not null default true, "trigger_id" text not null, "action_type" text check ("action_type" in ('outgoing_webhook', 'outgoing_request', 'medusa_workflow')) not null, "target_url" text null, "signing_secret_id" text null, "request_method" text null, "target_headers" jsonb null, "medusa_workflow" text null, "field_mappings" jsonb null, "static_values" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_action_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_action_trigger_id" ON "webhook_action" ("trigger_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_action_deleted_at" ON "webhook_action" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_query" ("id" text not null, "action_id" text not null, "entity_name" text not null, "fields" jsonb null, "filters" jsonb null, "limit" integer not null default 10, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_query_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webhook_query_action_id_unique" ON "webhook_query" ("action_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_query_deleted_at" ON "webhook_query" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_delivery" ("id" text not null, "event_name" text not null, "request_payload" jsonb null, "response_status" integer null, "response_body" text null, "status" text check ("status" in ('pending', 'success', 'failed')) not null default 'pending', "attempts" integer not null default 0, "error_message" text null, "action_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_delivery_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_delivery_action_id" ON "webhook_delivery" ("action_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_delivery_deleted_at" ON "webhook_delivery" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "webhook_receipt" drop constraint if exists "webhook_receipt_trigger_id_foreign";`);
    this.addSql(`alter table if exists "webhook_receipt" add constraint "webhook_receipt_trigger_id_foreign" foreign key ("trigger_id") references "webhook_trigger" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "webhook_action" drop constraint if exists "webhook_action_trigger_id_foreign";`);
    this.addSql(`alter table if exists "webhook_action" add constraint "webhook_action_trigger_id_foreign" foreign key ("trigger_id") references "webhook_trigger" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "webhook_query" drop constraint if exists "webhook_query_action_id_foreign";`);
    this.addSql(`alter table if exists "webhook_query" add constraint "webhook_query_action_id_foreign" foreign key ("action_id") references "webhook_action" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "webhook_delivery" drop constraint if exists "webhook_delivery_action_id_foreign";`);
    this.addSql(`alter table if exists "webhook_delivery" add constraint "webhook_delivery_action_id_foreign" foreign key ("action_id") references "webhook_action" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "webhook_receipt" drop constraint if exists "webhook_receipt_trigger_id_foreign";`);

    this.addSql(`alter table if exists "webhook_action" drop constraint if exists "webhook_action_trigger_id_foreign";`);

    this.addSql(`alter table if exists "webhook_query" drop constraint if exists "webhook_query_action_id_foreign";`);

    this.addSql(`alter table if exists "webhook_delivery" drop constraint if exists "webhook_delivery_action_id_foreign";`);

    this.addSql(`drop table if exists "webhook_secret" cascade;`);

    this.addSql(`drop table if exists "webhook_trigger" cascade;`);

    this.addSql(`drop table if exists "webhook_receipt" cascade;`);

    this.addSql(`drop table if exists "webhook_action" cascade;`);

    this.addSql(`drop table if exists "webhook_query" cascade;`);

    this.addSql(`drop table if exists "webhook_delivery" cascade;`);
  }

}
