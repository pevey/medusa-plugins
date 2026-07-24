<script lang="ts">
	import InputText from '../input-text/input-text.svelte'
	import { getAddressContext } from './ctx.svelte.js'
	let { label = 'Address', prefix = '', class: className = '', ...rest }: { label?: string; prefix?: '' | 'billing_'; class?: string; [k: string]: unknown } = $props()
	const ctx = getAddressContext()
</script>
<InputText field={ctx.form.fields[`${prefix}address_1`]} {label} autocomplete="address-line1" onchange={ctx.onchange} class={className} {...rest} />
