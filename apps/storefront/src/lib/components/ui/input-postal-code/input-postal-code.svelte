<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit'
	import InputText from '../input-text/input-text.svelte'

	interface Props {
		field: RemoteFormField<any>
		label?: string
		placeholder?: string
		class?: string
		onchange?: (event: Event) => void
		[key: string]: unknown
	}
	let { field, label = '', placeholder = '', class: className = '', onchange, ...rest }: Props = $props()

	// Uppercase on INPUT only (internal). Programmatic value/field.set dispatch no DOM events, so
	// this can't re-fire; the consumer's onchange fires only on the native `change` event below.
	function oninput(event: Event) {
		const input = event.currentTarget as HTMLInputElement
		const up = input.value.toUpperCase()
		if (input.value !== up) input.value = up
		field.set(up)
	}
</script>

<InputText {field} {label} {placeholder} class={className} {oninput} {onchange} {...rest} />
