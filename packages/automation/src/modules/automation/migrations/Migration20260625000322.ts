import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260625000322 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "automation_trigger" add column if not exists "signature_config" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "automation_trigger" drop column if exists "signature_config";`);
  }

}
