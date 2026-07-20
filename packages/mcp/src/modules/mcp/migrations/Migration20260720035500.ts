import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260720035500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "chat_session" ("id" text not null, "user_id" text not null, "title" text not null, "last_message_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_session_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_session_deleted_at" ON "chat_session" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "chat_message" ("id" text not null, "role" text check ("role" in ('user', 'assistant')) not null, "content" jsonb not null, "session_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_session_id" ON "chat_message" ("session_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_deleted_at" ON "chat_message" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "chat_message" add constraint "chat_message_session_id_foreign" foreign key ("session_id") references "chat_session" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "chat_message" drop constraint if exists "chat_message_session_id_foreign";`);

    this.addSql(`drop table if exists "chat_session" cascade;`);

    this.addSql(`drop table if exists "chat_message" cascade;`);
  }

}
