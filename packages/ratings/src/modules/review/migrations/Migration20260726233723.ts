import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726233723 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "review_activity" drop constraint if exists "review_activity_type_check";`);

    this.addSql(`alter table if exists "review" add column if not exists "featured" boolean not null default false;`);

    this.addSql(`alter table if exists "review_activity" add constraint "review_activity_type_check" check("type" in ('submit', 'approve', 'reject', 'feature', 'unfeature', 'note'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "review_activity" drop constraint if exists "review_activity_type_check";`);

    this.addSql(`alter table if exists "review" drop column if exists "featured";`);

    this.addSql(`alter table if exists "review_activity" add constraint "review_activity_type_check" check("type" in ('submit', 'approve', 'reject', 'note'));`);
  }

}
