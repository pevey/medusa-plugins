<script lang="ts">
	import { GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import { CheckoutBraintree } from '$lib/components/ui/checkout/index.js'
</script>

<CheckoutBraintree googlePlacesApiKey={GOOGLE_PLACES_API_KEY} />
