import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260718021425 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "access_role_policy" drop constraint if exists "access_role_policy_role_id_policy_id_unique";`);
    this.addSql(`alter table if exists "access_role_parent" drop constraint if exists "access_role_parent_role_id_parent_id_unique";`);
    this.addSql(`alter table if exists "access_role" drop constraint if exists "access_role_name_unique";`);
    this.addSql(`alter table if exists "access_policy" drop constraint if exists "access_policy_key_unique";`);
    this.addSql(`create table if not exists "access_policy" ("id" text not null, "key" text not null, "resource" text not null, "operation" text not null, "name" text null, "description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "access_policy_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_policy_deleted_at" ON "access_policy" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_access_policy_key_unique" ON "access_policy" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_policy_resource" ON "access_policy" ("resource") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_policy_operation" ON "access_policy" ("operation") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "access_role" ("id" text not null, "name" text not null, "description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "access_role_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_deleted_at" ON "access_role" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_access_role_name_unique" ON "access_role" ("name") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "access_role_parent" ("id" text not null, "role_id" text not null, "parent_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "access_role_parent_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_parent_role_id" ON "access_role_parent" ("role_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_parent_parent_id" ON "access_role_parent" ("parent_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_parent_deleted_at" ON "access_role_parent" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_access_role_parent_role_id_parent_id_unique" ON "access_role_parent" ("role_id", "parent_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "access_role_policy" ("id" text not null, "role_id" text not null, "policy_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "access_role_policy_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_policy_role_id" ON "access_role_policy" ("role_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_policy_policy_id" ON "access_role_policy" ("policy_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_policy_deleted_at" ON "access_role_policy" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_access_role_policy_role_id_policy_id_unique" ON "access_role_policy" ("role_id", "policy_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "access_role_parent" add constraint "access_role_parent_role_id_foreign" foreign key ("role_id") references "access_role" ("id") on update cascade;`);
    this.addSql(`alter table if exists "access_role_parent" add constraint "access_role_parent_parent_id_foreign" foreign key ("parent_id") references "access_role" ("id") on update cascade;`);

    this.addSql(`alter table if exists "access_role_policy" add constraint "access_role_policy_role_id_foreign" foreign key ("role_id") references "access_role" ("id") on update cascade;`);
    this.addSql(`alter table if exists "access_role_policy" add constraint "access_role_policy_policy_id_foreign" foreign key ("policy_id") references "access_policy" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "access_role_policy" drop constraint if exists "access_role_policy_policy_id_foreign";`);

    this.addSql(`alter table if exists "access_role_parent" drop constraint if exists "access_role_parent_role_id_foreign";`);

    this.addSql(`alter table if exists "access_role_parent" drop constraint if exists "access_role_parent_parent_id_foreign";`);

    this.addSql(`alter table if exists "access_role_policy" drop constraint if exists "access_role_policy_role_id_foreign";`);

    this.addSql(`drop table if exists "access_policy" cascade;`);

    this.addSql(`drop table if exists "access_role" cascade;`);

    this.addSql(`drop table if exists "access_role_parent" cascade;`);

    this.addSql(`drop table if exists "access_role_policy" cascade;`);
  }

}
