# medusa-plugin-ses

Notification plugin for Medusa for sending email notifications via AWS SES (Simple Email Service).

[Documentation](https://pevey.com/medusa-plugin-ses)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

> Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

## Features

- Templates are stored locally.
- Templates are based on handlebars, so they are compatible with Sendgrid email templates
- You can refer to the Medusa template reference to see all data fields that are available for each event: [Template Reference](https://docs.medusajs.com/plugins/notifications/sendgrid#template-reference)
- An API endpoint that is useful for testing and that can be used with other (non-Medusa) portions of your storefront application is included. By default, the endpoint does nothing for security reasons. See configuration options below to enable it.

## Installation

Inside your medusa backend root folder, type:

```bash
yarn add medusa-plugin-ses
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your medusa-config.js file similar to other plugins.

```js
const plugins = [
	//... other plugins
	{
		resolve: 'medusa-plugin-ses',
		options: {
			access_key_id: process.env.SES_ACCESS_KEY_ID,
			secret_access_key: process.env.SES_SECRET_ACCESS_KEY,
			region: process.env.SES_REGION,
			from: process.env.SES_FROM,
			template_path: process.env.SES_TEMPLATE_PATH,
			partial_path: process.env.SES_PARTIAL_PATH,
			// optional string containing email address separated by comma
			order_placed_cc: 'person1@example.com,person2@example.com',
			enable_endpoint: process.env.SES_ENABLE_ENDPOINT,
			enable_sim_mode: process.env.SES_ENABLE_SIM_MODE
		}
	}
	//... other plugins
]
```

The credentials and region are pulled from env variables.

```bash
SES_REGION=""
SES_ACCESS_KEY_ID=""
SES_SECRET_ACCESS_KEY=""
SES_FROM="Cool Company <orders@example.com>"
SES_TEMPLATE_PATH="data/templates"
SES_PARTIAL_PATH="data/partials"
SES_ENABLE_ENDPOINT=""
SES_ENABLE_SIM_MODE=""
```

- SES_REGION will be for example "us-east-1"

- Obtain the access key id and secret access key by creating an IAM user with SES send permissions.

- The SES_FROM email address must be a verified sender in your AWS account.

- The SES_TEMPLATE_PATH can be absolute (starting with '/', e.g., '/home/pevey/www/medusa/data/templates') or relative (e.g., 'data/templates')

- Partials are optional and supported in plugin versions 2.1.0 or later. Any partials with the .hbs file extension that are located in the configured partials directory will be registered and available for use in templates. For more information about Handlebars partials and how to use them in your templates, see the [Handlebars documentation](https://handlebarsjs.com/guide/partials.html).

- See the "Testing" section below for important info on enabling the endpoint and enabling simulation mode for the endpoint.

Remember that the from email address must be a verified sender in your AWS console.
Also remember that if your AWS account is still in sandbox mode, you can only SEND emails to verified sender email addresses.

## Templates

The templates used are stored locally. Create a 'data/templates' folder and include the entire path in the SES_TEMPLATE_PATH variable.

```bash
medusa-server  // root directory
|-data
      |-templates
            |-order_placed  // or whatever you name your templates and specify in the config file
                  |-subject.hbs
                  |-html.hbs
                  |-text.hbs
            |-gift_card_created
                  |-subject.hbs
                  |-html.hbs
                  |-text.hbs
            |- etc
```

When emails are sent, each of the three parts will be compiled.

- Subject is required
- Either html or text is required.

## Dynamic Usage

You can resolve the service to send emails from your custom services or other resources. For example, on a custom API endpoint, you can add:

```js
const sesService = req.scope.resolve('sesService')

const sendOptions = {
	templateId: 'd-123....',
	from: 'ACME <acme@mail.com>',
	to: 'customer@mail.com',
	data: {}
}

sesService.sendEmail(sendOptions)
```

Make sure you consider security and enable proper protections on your endpoint if you do this.

## Testing

This plugin adds an endpoint at http://[server]/ses/send

By default, the endpoint will refuse to send any emails.
This endpoint may be useful for testing purposes in a development environment or for use by related applications.

There is NO SECURITY on the endpoint by default. Most people will NOT need to enable this endpoint.
If you are certain that you want to enable it and that you know what you are doing,
set the environment variable SES_ENABLE_ENDPOINT to the string you will use as your pass key when sending requests to the endpoint.

To use the endpoint, POST a json req.body with: pass_key, template_id, from, to, and data to /ses/send.

Example:

```bash
SES_ENABLE_ENDPOINT="42"
```

```json
{
	"template_id": "customer_password_reset",
	"from": "me@me.com",
	"to": "you@you.com",
	"data": {
		"customer": {
			"first_name": "Test"
		}
	},
	"pass_key": "42"
}
```

Setting the enable_sim_mode option to true will cause the endpoint to return information about whether the template was successfully compiled and the compiled result, but it will not actually send the email. This setting only applies to calls to the ses/send endpoint. It does not affect other calls to the notification service from within Medusa, which will still send emails as per usual.
