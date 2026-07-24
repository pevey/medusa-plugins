<script lang="ts">
	import InputPostalCode from '../input-postal-code/input-postal-code.svelte'
	import { getAddressContext } from './ctx.svelte.js'
	let { label = 'Postal code', prefix = '', class: className = '', ...rest }: { label?: string; prefix?: '' | 'billing_'; class?: string; [k: string]: unknown } = $props()
	const ctx = getAddressContext()
</script>
<InputPostalCode field={ctx.form.fields[`${prefix}postal_code`]} {label} autocomplete="postal-code" onchange={ctx.onchange} class={className} {...rest} />
