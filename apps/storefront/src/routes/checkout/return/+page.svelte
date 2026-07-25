<script lang="ts">
	import { STRIPE_KEY } from '$app/env/public'
	import { Return } from '$lib/components/ui/checkout/index.js'
</script>

<Return publishableKey={STRIPE_KEY} />
