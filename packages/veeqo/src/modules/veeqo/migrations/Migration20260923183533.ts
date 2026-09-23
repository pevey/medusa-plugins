import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260923183533 extends Migration {
	override async up(): Promise<void> {
		this.addSql(`alter table if exists "veeqo_channel" alter column "veeqo_channel_id" type text using ("veeqo_channel_id"::text);`)

		this.addSql(`alter table if exists "veeqo_customer" alter column "veeqo_customer_id" type text using ("veeqo_customer_id"::text);`)

		this.addSql(`alter table if exists "veeqo_delivery_method" alter column "veeqo_delivery_method_id" type text using ("veeqo_delivery_method_id"::text);`)

		this.addSql(`alter table if exists "veeqo_order" alter column "veeqo_order_id" type text using ("veeqo_order_id"::text);`)

		this.addSql(`alter table if exists "veeqo_product" alter column "veeqo_product_id" type text using ("veeqo_product_id"::text);`)

		this.addSql(`alter table if exists "veeqo_sellable" alter column "veeqo_sellable_id" type text using ("veeqo_sellable_id"::text);`)

		this.addSql(`alter table if exists "veeqo_shipment" alter column "veeqo_allocation_id" type text using ("veeqo_allocation_id"::text);`)
		this.addSql(`alter table if exists "veeqo_shipment" alter column "veeqo_shipment_id" type text using ("veeqo_shipment_id"::text);`)

		this.addSql(`alter table if exists "veeqo_warehouse" alter column "veeqo_warehouse_id" type text using ("veeqo_warehouse_id"::text);`)
	}

	override async down(): Promise<void> {
		this.addSql(`alter table if exists "veeqo_channel" alter column "veeqo_channel_id" type integer using ("veeqo_channel_id"::integer);`)

		this.addSql(`alter table if exists "veeqo_customer" alter column "veeqo_customer_id" type integer using ("veeqo_customer_id"::integer);`)

		this.addSql(
			`alter table if exists "veeqo_delivery_method" alter column "veeqo_delivery_method_id" type integer using ("veeqo_delivery_method_id"::integer);`
		)

		this.addSql(`alter table if exists "veeqo_order" alter column "veeqo_order_id" type integer using ("veeqo_order_id"::integer);`)

		this.addSql(`alter table if exists "veeqo_product" alter column "veeqo_product_id" type integer using ("veeqo_product_id"::integer);`)

		this.addSql(`alter table if exists "veeqo_sellable" alter column "veeqo_sellable_id" type integer using ("veeqo_sellable_id"::integer);`)

		this.addSql(`alter table if exists "veeqo_shipment" alter column "veeqo_allocation_id" type integer using ("veeqo_allocation_id"::integer);`)
		this.addSql(`alter table if exists "veeqo_shipment" alter column "veeqo_shipment_id" type integer using ("veeqo_shipment_id"::integer);`)

		this.addSql(`alter table if exists "veeqo_warehouse" alter column "veeqo_warehouse_id" type integer using ("veeqo_warehouse_id"::integer);`)
	}
}
