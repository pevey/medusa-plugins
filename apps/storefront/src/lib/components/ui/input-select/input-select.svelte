<script module lang="ts">
	export type SelectOption = { value: string; label: string }
</script>

<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit'
	import * as Field from '$lib/components/ui/field/index.js'
	import { cn } from '$lib/utils.js'
	import ChevronDown from '@lucide/svelte/icons/chevron-down'

	interface Props {
		field: RemoteFormField<any>
		options: SelectOption[]
		label?: string
		placeholder?: string
		description?: string
		class?: string
		onchange?: (event: Event) => void
		[key: string]: unknown
	}
	let {
		field,
		options,
		label = '',
		placeholder = '',
		description = '',
		class: className = '',
		onchange,
		...rest
	}: Props = $props()

	// shadcn-trigger-like native <select> style (appearance-none + pr-8 make room for the chevron).
	const selectClass =
		'border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive h-9 w-full appearance-none rounded-md border bg-transparent px-3 py-1 pr-8 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

	const issues = $derived(field.issues())
	const invalid = $derived(issues && issues.length > 0 ? 'true' : undefined)
	const name = $derived(field.as('select').name)
</script>

<Field.Field data-invalid={invalid}>
	{#if label}<Field.FieldLabel for={name}>{label}</Field.FieldLabel>{/if}
	<div class="relative">
		<!-- `.as('select')` binds via a value getter/setter (no event handler), so `onchange` is
		     additive and does not clobber the form binding. -->
		<select id={name} {...field.as('select')} {onchange} class={cn(selectClass, className)} {...rest}>
			{#if placeholder}<option value="" disabled>{placeholder}</option>{/if}
			{#each options as opt (opt.value)}<option value={opt.value}>{opt.label}</option>{/each}
		</select>
		<ChevronDown class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 opacity-50" />
	</div>
	{#if description}<Field.FieldDescription>{description}</Field.FieldDescription>{/if}
	<Field.FieldError errors={issues} />
</Field.Field>
