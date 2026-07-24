<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit'
	import InputSelect from '../input-select/input-select.svelte'
	import InputText from '../input-text/input-text.svelte'
	import { resolveProvince, defaultProvinceConfig, type ProvinceConfig } from './provinces'

	interface Props {
		field: RemoteFormField<any>
		country?: string
		config?: ProvinceConfig
		label?: string
		placeholder?: string
		class?: string
		onchange?: (event: Event) => void
		[key: string]: unknown
	}
	let {
		field,
		country = '',
		config = defaultProvinceConfig,
		label,
		placeholder = '',
		class: className = '',
		onchange,
		...rest
	}: Props = $props()

	const resolved = $derived(resolveProvince(config, country))
</script>

{#if resolved.mode === 'select'}
	<InputSelect {field} options={resolved.options} label={label ?? resolved.label} {placeholder} class={className} {onchange} {...rest} />
{:else}
	<InputText {field} label={label ?? 'Province'} {placeholder} class={className} {onchange} {...rest} />
{/if}
