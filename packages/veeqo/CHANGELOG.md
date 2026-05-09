## 0.3.0

- BREAKING CHANGE: The `veeqo_order` table schema was updated. Migrations must be run after upgrading. After running the migration, reverting to the previous plugin version will not be possible without data loss.
- Added support for Medusa Claims (with Replace action) and Exchanges. Each one creates a new Veeqo order for the outbound replacement shipment via two new subscribers (`order.claim_created`, `order.exchange_created`).

## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4
