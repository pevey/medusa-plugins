<script lang="ts">
	import { STRIPE_KEY } from '$app/env/public'
	import { StripeExpressCheckout } from '$lib/components/ui/cta'
	import { createProductIntent } from '$src/lib/payment.remote.js'

	let { data } = $props()

	const variant = $derived(data.product?.variants?.[0])
	const price = $derived(variant?.calculated_price)
	const amount = $derived(Math.round((Number(price?.calculated_amount) || 0) * 100))
	const currency = $derived(price?.currency_code ?? 'usd')

	let status = $state<'idle' | 'paid' | 'error'>('idle')
	let message = $state('')
</script>

<div class="mx-auto flex max-w-md flex-col gap-6 p-8">
	<a href="/product-demo" class="text-sm text-muted-foreground hover:underline">← Product demo</a>

	<div class="space-y-2">
		<h1 class="text-2xl font-bold">{data.product?.title ?? 'Test product'}</h1>
		{#if data.product?.description}
			<p class="text-muted-foreground">{data.product.description}</p>
		{/if}
		{#if amount > 0}
			<p class="text-lg font-medium">{(amount / 100).toFixed(2)} {currency.toUpperCase()}</p>
		{/if}
	</div>

	{#if amount > 0}
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">
				One-tap wallet purchase (Apple / Google Pay / Link):
			</p>
			<StripeExpressCheckout
				publishableKey={STRIPE_KEY}
				{amount}
				{currency}
				onConfirm={async ({ confirm }) => {
					try {
						const { clientSecret } = await createProductIntent()
						const { error, paymentIntent } = await confirm(clientSecret)
						if (error) {
							status = 'error'
							message = error.message ?? 'Payment failed'
						} else {
							status = 'paid'
							message = `Paid — ${paymentIntent?.id ?? ''}`
						}
					} catch (e) {
						status = 'error'
						message = e instanceof Error ? e.message : 'Payment failed'
					}
				}}
			/>
		</div>
	{:else}
		<p class="text-sm text-destructive">
			No price for the Test product in the default region — set one in Medusa admin.
		</p>
	{/if}

	{#if status === 'paid'}
		<p
			class="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200"
		>
			✅ {message}
		</p>
	{:else if status === 'error'}
		<p
			class="rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200"
		>
			⚠️ {message}
		</p>
	{/if}
</div>
