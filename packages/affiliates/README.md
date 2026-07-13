# medusa-plugin-affiliates

Affiliate management and per-order attribution for Medusa v2. Link Medusa promotion codes to affiliate accounts, track earned revenue per order across the placed/captured/completed/voided lifecycle, and enforce stacking rules at cart time.

[Documentation](https://pevey.com/medusa-plugin-affiliates)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Affiliate accounts with contact info, addresses, and status (`active`, `restricted`, `inactive`)
- Link one or more Medusa promotion codes to an affiliate via a module link
- Per-order attribution ledger with `placed_at`, `captured_at`, `completed_at`, and `voided_at` timestamps
- Nightly reconciliation job that back-fills lifecycle timestamps and picks up orders missed by real-time events
- On-demand recalculation endpoint per affiliate
- Cart-level guard that prevents an affiliate code from stacking with other promotions when disabled
- Stats endpoint per affiliate with day/week/month/year/all windows, bucketed by currency
- Admin pages under `/admin/affiliates` for managing affiliates, addresses, and linked promotion codes

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-affiliates
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-affiliates',
			options: {
				payoutBasis: 'completed',
				defaultCommissionBasis: 'gross',
				defaultCommissionRate: 0.1,
				allowStackingWithNonAffiliatePromotions: false
			}
		}
		// ... other plugins
	]
})
```

### Plugin options

| Option                                    | Type                                    | Default       | Description                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | --------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payoutBasis`                             | `'placed' \| 'captured' \| 'completed'` | `'completed'` | Which order lifecycle event triggers commission earning. `placed` counts revenue as soon as the order is placed; `captured` waits until payment is captured; `completed` waits until the order is fully completed (fulfilled). Voided orders are always excluded regardless of setting. |
| `defaultCommissionBasis`                  | `'gross' \| 'net'`                      | `'net'`       | Whether commission is calculated against the order subtotal before discounts (`gross`) or after discounts (`net`). Used as the default when an individual affiliate does not override it.                                                                                               |
| `defaultCommissionRate`                   | `number`                                | _unset_       | Default commission rate applied when an individual affiliate does not have one set. Expressed as a decimal (`0.1` = 10%). If neither the default nor a per-affiliate rate is set, attributions record `commission_rate: null` until backfilled.                                         |
| `allowStackingWithNonAffiliatePromotions` | `boolean`                               | `true`        | If `false`, the cart-level workflow hook rejects any attempt to combine an affiliate promotion code with a non-affiliate promotion code on the same cart. Rejection surfaces to the storefront as a `NOT_ALLOWED` error.                                                                |

At most one affiliate promotion code is allowed on a cart at a time regardless of `allowStackingWithNonAffiliatePromotions` — this is a hard constraint enforced by the same guard.

## Attribution model

Each row in the `affiliate_attribution` table represents one order attributed to one affiliate through one linked promotion:

- `affiliate_id`, `promotion_id`, `order_id` — the triad the row is keyed by (`order_id` is unique)
- `currency_code`, `gross_subtotal`, `net_subtotal` — captured at the time of the initial insert
- `placed_at`, `captured_at`, `completed_at`, `voided_at` — filled in as the order's state advances
- `commission_rate`, `commission_amount`, `payout_id`, `paid_at` — reserved for downstream payout tooling

Attributions are inserted the first time the reconciliation job (or the on-demand endpoint) sees the order. Later runs update lifecycle timestamps as the order moves through its states; existing timestamps are never overwritten.

## Nightly attribution reconciliation job

A scheduled job at `0 1 * * *` (01:00 daily, server time) walks recent orders and updates the attribution ledger:

- Uses a **watermark** based on the latest ledger timestamp minus 24 hours of overlap so nothing gets missed at the boundary
- Only touches orders whose `updated_at` is after the watermark
- Inserts a new attribution row the first time an affiliate-linked promotion appears on an order
- Updates `captured_at`, `completed_at`, and `voided_at` on existing rows as those states become true; never overwrites a previously-set timestamp
- Skips orders that don't carry any affiliate-linked promotion codes

Like all Medusa scheduled jobs, it only runs on worker processes (`WORKER_MODE=worker` or `shared`). Success and failure are logged with the affiliate module's logger.

## On-demand recalculation

Trigger the same reconciliation for a single affiliate at any time:

```
POST /admin/affiliates/:id/attributions/recalculate
```

Useful after fixing a mis-linked promotion, importing historical orders, or investigating a discrepancy.

## Promotion-stacking guard

The plugin registers a validate hook on `updateCartPromotionsWorkflow` (and the equivalent draft-order workflow) that inspects incoming promo codes against the current cart's codes:

- Rejects if more than one affiliate code is applied at once
- Rejects if an affiliate code is added to a cart with non-affiliate codes when `allowStackingWithNonAffiliatePromotions: false`
- Rejects if a non-affiliate code is added to a cart with an affiliate code under the same option
- When a new affiliate code replaces an existing one, the old affiliate code is automatically removed

All rejections throw `MedusaError.Types.NOT_ALLOWED` with a message the storefront can surface.

## Stats

Per-affiliate stats are available at:

```
GET /admin/affiliates/:id/stats?window=<day|week|month|year|all>&basis=<placed|captured|completed>
```

Response buckets orders by currency, with `order_count`, `gross_total`, `net_total`, `average_order_value_gross`, and `average_order_value_net`. Voided attributions are excluded regardless of the window.

The affiliate's own `currency_code` (if set) is returned as the first bucket; remaining currencies follow alphabetically.

## Usage

- Create and manage affiliates from Settings > Affiliates in the Medusa admin.
- Attach one or more addresses per affiliate and mark one as primary for tax/payout routing.
- Link Medusa promotion codes to an affiliate from the affiliate detail page. Use standard Medusa promotion configuration (percentage or flat, rules, etc.) — this plugin only owns the affiliate ↔ promotion link and the attribution ledger.
- Reactivate and retire promotion links without deleting them via the promotion detail actions.
- Review earnings per affiliate via the Stats section on the detail page or the `/stats` endpoint.
