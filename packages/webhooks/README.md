# medusa-plugin-webhooks

Webhook automation plugin for Medusa v2. Configure triggers from Medusa events or incoming webhooks, and execute actions like outgoing webhooks, HTTP requests, or Medusa workflows.

[Documentation](https://pevey.com/medusa-plugin-webhooks)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Two trigger types: Medusa events and incoming webhooks
- Three action types: outgoing webhooks, outgoing HTTP requests, and Medusa workflow execution
- HMAC-SHA256 signing for outgoing webhooks and incoming verification
- Field mapping with dot-notation paths and fan-out iteration
- Optional query augmentation to enrich event data before action execution
- Delivery tracking with response codes and error logging
- Receipt logging for incoming webhook payloads with sensitive data redaction
- Signing secret management with secure one-time display
- Admin pages for trigger, action, and secret management

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-webhooks
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-webhooks',
			options: {}
		}
		// ... other plugins
	]
})
```

## Usage

- Configure webhook triggers and actions in Settings > Webhooks in the Medusa admin.
- Create signing secrets for HMAC-SHA256 verification.
- Receive incoming webhooks at `POST /webhooks/:triggerId`.
- Monitor deliveries and receipts from the trigger and action detail pages.
