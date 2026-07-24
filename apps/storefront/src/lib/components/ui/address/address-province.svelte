<script lang="ts">
	import InputProvince from '../input-province/input-province.svelte'
	import { getAddressContext } from './ctx.svelte.js'
	let { label, prefix = '', class: className = '', ...rest }: { label?: string; prefix?: '' | 'billing_'; class?: string; [k: string]: unknown } = $props()
	const ctx = getAddressContext()
	const field = $derived(ctx.form.fields[`${prefix}province`])
	const country = $derived(ctx.form.fields[`${prefix}country_code`]?.value() ?? '')
</script>
<InputProvince {field} {country} config={ctx.provinceConfig} {label} autocomplete="address-level1" onchange={ctx.onchange} class={className} {...rest} />
