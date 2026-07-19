## 1.0.0

- Dropped webhookSecret from config options. Braintree has there own way of validating webhooks, so this was unused.
- Dropped defaultCurrencyCode from options and added option merchantAccountId. Configuring multiple braintree payment providers in medusa-config.ts with Braintree subaccount merchantAccountIds and then associating each with a region in the Medusa dashboard is the preferred way to handle multiple currencies.
- Line items and shipping/tax/discount amounts now flow through to Braintree via the data.context. This is useful for B2B stores with commercial card users. The customers will now have much richer data for easier accounting.
- The Medusa transaction id is now sent to Braintree as the 'order id' when createTransaction is called. The id is later used to match transactions when webhooks are received.

## 0.2.2

- Updated medusa packages to 2.17.2
- Migrated all integration tests to work with changes introduced in @medusajs/test-utils 2.17.0

## 0.2.1

- Upgrade underlying Medusa packages

## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4
