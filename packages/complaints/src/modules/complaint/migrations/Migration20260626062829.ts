import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260626062829 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`create table if not exists "complaint_document" ("id" text not null, "file_key" text not null, "filename" text not null, "mime_type" text not null, "size_bytes" integer not null, "uploaded_by" text null, "complaint_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "complaint_document_pkey" primary key ("id"));`
		)
		this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_document_complaint_id" ON "complaint_document" ("complaint_id") WHERE deleted_at IS NULL;`)
		this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_complaint_document_deleted_at" ON "complaint_document" ("deleted_at") WHERE deleted_at IS NULL;`)

		this.addSql(
			`alter table if exists "complaint_document" add constraint "complaint_document_complaint_id_foreign" foreign key ("complaint_id") references "complaint" ("id") on update cascade;`
		)
	}

	override async down(): Promise<void> {
		this.addSql(`drop table if exists "complaint_document" cascade;`)
	}
}
