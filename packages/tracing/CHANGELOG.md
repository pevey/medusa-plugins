## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4

## 0.1.1

- Replace fulfillment hook with a subscriber on fulfillment.created event to reduce potential for conflicts with other plugins and customizations.
