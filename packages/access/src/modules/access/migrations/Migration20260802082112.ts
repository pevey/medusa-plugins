import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260802082112 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "access_role_policy" add column if not exists "scope" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "access_role_policy" drop column if exists "scope";`);
  }

}
