### Example of Sending an Email with a Generated Attachment

```ts
const attachment: Attachment = {
	filename: 'test.csv',
	content: 'bmFtZSxhZ2UKQmFydG9zeiwyNg=='
}

await notifications.createNotifications({
	receiver_id: customer.id,
	to: customer.email,
	channel: 'email',
	trigger_type: EVENT,
	content: {
		subject: 'Hello Medusa from SES!',
		text: 'You should see this text in your inbox.'
	},
	attachments: [attachment]
})
```
