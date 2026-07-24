<script lang="ts">
	import InputText from '../input-text/input-text.svelte'
	import { getAddressContext } from './ctx.svelte.js'
	let { label = 'First name', prefix = '', class: className = '', ...rest }: { label?: string; prefix?: '' | 'billing_'; class?: string; [k: string]: unknown } = $props()
	const ctx = getAddressContext()
</script>
<InputText field={ctx.form.fields[`${prefix}first_name`]} {label} autocomplete="given-name" onchange={ctx.onchange} class={className} {...rest} />
