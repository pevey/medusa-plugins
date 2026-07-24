<script lang="ts">
	import { STRIPE_KEY, STRIPE_REDIRECT_URL } from '$app/env/public'
	import { CheckoutStripe } from '$lib/components/ui/checkout/index.js'
</script>

<CheckoutStripe publishableKey={STRIPE_KEY} returnUrl={STRIPE_REDIRECT_URL} />
