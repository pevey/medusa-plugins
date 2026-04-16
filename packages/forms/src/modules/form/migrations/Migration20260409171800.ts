import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260409171800 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "form" drop constraint if exists "form_handle_unique";`);
    this.addSql(`create table if not exists "form" ("id" text not null, "name" text not null, "handle" text not null, "description" text null, "active" boolean not null default true, "turnstile_enabled" boolean not null default true, "notification_emails" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "form_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_form_handle_unique" ON "form" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_deleted_at" ON "form" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "form_field" ("id" text not null, "name" text not null, "label" text not null, "field_type" text not null, "required" boolean not null default false, "sort_order" integer not null default 0, "form_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "form_field_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_field_form_id" ON "form_field" ("form_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_field_deleted_at" ON "form_field" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "form_field_option" ("id" text not null, "label" text not null, "value" text not null, "sort_order" integer not null default 0, "form_field_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "form_field_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_field_option_form_field_id" ON "form_field_option" ("form_field_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_field_option_deleted_at" ON "form_field_option" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "form_submission" ("id" text not null, "data" jsonb not null, "ip_address" text null, "user_agent" text null, "status" text check ("status" in ('new', 'read', 'archived')) not null default 'new', "form_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "form_submission_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_submission_form_id" ON "form_submission" ("form_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_form_submission_deleted_at" ON "form_submission" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "form_field" drop constraint if exists "form_field_form_id_foreign";`);
    this.addSql(`alter table if exists "form_field" add constraint "form_field_form_id_foreign" foreign key ("form_id") references "form" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "form_field_option" drop constraint if exists "form_field_option_form_field_id_foreign";`);
    this.addSql(`alter table if exists "form_field_option" add constraint "form_field_option_form_field_id_foreign" foreign key ("form_field_id") references "form_field" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "form_submission" drop constraint if exists "form_submission_form_id_foreign";`);
    this.addSql(`alter table if exists "form_submission" add constraint "form_submission_form_id_foreign" foreign key ("form_id") references "form" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "form_field" drop constraint if exists "form_field_form_id_foreign";`);

    this.addSql(`alter table if exists "form_submission" drop constraint if exists "form_submission_form_id_foreign";`);

    this.addSql(`alter table if exists "form_field_option" drop constraint if exists "form_field_option_form_field_id_foreign";`);

    this.addSql(`drop table if exists "form" cascade;`);

    this.addSql(`drop table if exists "form_field" cascade;`);

    this.addSql(`drop table if exists "form_field_option" cascade;`);

    this.addSql(`drop table if exists "form_submission" cascade;`);
  }

}
