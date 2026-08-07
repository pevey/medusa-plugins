import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260807020259 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "access_role_assignment" ("id" text not null, "role_id" text not null, "grantee_type" text not null, "grantee_id" text not null, "scope_type" text null, "scope_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "access_role_assignment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_assignment_role_id" ON "access_role_assignment" ("role_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_assignment_deleted_at" ON "access_role_assignment" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_assignment_grantee_type_grantee_id" ON "access_role_assignment" ("grantee_type", "grantee_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_access_role_assignment_scope_type_scope_id_grantee_type_grantee_id" ON "access_role_assignment" ("scope_type", "scope_id", "grantee_type", "grantee_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "access_role_assignment" add constraint "access_role_assignment_role_id_foreign" foreign key ("role_id") references "access_role" ("id") on update cascade;`);

    // A half-set scope is always a bug; null/null means the role applies everywhere.
    this.addSql(`alter table if exists "access_role_assignment" add constraint "CK_access_role_assignment_scope_pair" check (("scope_type" is null) = ("scope_id" is null));`);

    // Plain unique treats NULLs as distinct, which would admit duplicate
    // unscoped assignments — hence the COALESCE expressions.
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_access_role_assignment_unique" ON "access_role_assignment" ("role_id", "grantee_type", "grantee_id", coalesce("scope_type", ''), coalesce("scope_id", '')) WHERE deleted_at IS NULL;`
    );

    // Copy the legacy actor<->role link tables into unscoped assignments. The
    // tables are created by Medusa's link-sync, so they may be absent (fresh
    // install, or a consumer that never linked that actor type) — each source
    // is guarded by to_regclass. Rows referencing missing or soft-deleted
    // roles are skipped (link tables carry no FK to access_role). The link
    // definitions are removed in this release; link-sync drops the tables on
    // the consumer's next db:migrate, after this copy has run.
    this.addSql(`
      DO $$
      DECLARE
        src record;
      BEGIN
        FOR src IN
          SELECT * FROM (VALUES
            ('user_user_access_access_role', 'user_id', 'user'),
            ('user_invite_access_access_role', 'invite_id', 'invite'),
            ('customer_customer_access_access_role', 'customer_id', 'customer'),
            ('customer_customer_group_access_access_role', 'customer_group_id', 'customer_group'),
            ('api_key_api_key_access_access_role', 'api_key_id', 'api_key')
          ) AS t(table_name, fk_column, grantee_type)
        LOOP
          IF to_regclass(src.table_name) IS NOT NULL THEN
            EXECUTE format(
              'INSERT INTO access_role_assignment (id, role_id, grantee_type, grantee_id, created_at, updated_at)
               SELECT ''acasg_'' || substr(replace(gen_random_uuid()::text, ''-'', ''''), 1, 26), l.access_role_id, %L, l.%I, l.created_at, now()
               FROM %I l
               JOIN access_role r ON r.id = l.access_role_id AND r.deleted_at IS NULL
               WHERE l.deleted_at IS NULL
               ON CONFLICT DO NOTHING',
              src.grantee_type, src.fk_column, src.table_name
            );
          END IF;
        END LOOP;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "access_role_assignment" cascade;`);
  }

}
