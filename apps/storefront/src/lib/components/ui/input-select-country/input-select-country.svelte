<script module lang="ts">
	export type Country = { code: string; name: string }
</script>

<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit'
	import InputSelect from '../input-select/input-select.svelte'

	interface Props {
		field: RemoteFormField<any>
		countries: Country[]
		label?: string
		placeholder?: string
		class?: string
		onchange?: (event: Event) => void
		[key: string]: unknown
	}
	let { field, countries, label = '', placeholder = '', class: className = '', onchange, ...rest }: Props = $props()

	const options = $derived(countries.map((c) => ({ value: c.code, label: c.name })))
</script>

<InputSelect {field} {options} {label} {placeholder} class={className} {onchange} {...rest} />
