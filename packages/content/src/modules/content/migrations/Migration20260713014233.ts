import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713014233 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_collection" add column if not exists "searchable" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "content_collection" drop column if exists "searchable";`);
  }

}
