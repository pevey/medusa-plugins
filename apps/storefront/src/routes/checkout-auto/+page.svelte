<script lang="ts">
	import { STRIPE_KEY, STRIPE_REDIRECT_URL, GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import { CheckoutAuto } from '$lib/components/ui/checkout/index.js'
</script>

<CheckoutAuto
	publishableKey={STRIPE_KEY}
	returnUrl={STRIPE_REDIRECT_URL}
	googlePlacesApiKey={GOOGLE_PLACES_API_KEY}
	config={{ pp_stripe_stripe: { elements: true } }}
/>
