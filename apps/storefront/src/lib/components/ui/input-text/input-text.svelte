<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit'
	import * as Field from '$lib/components/ui/field/index.js'
	import { cn } from '$lib/utils.js'
	import Eye from '@lucide/svelte/icons/eye'
	import EyeOff from '@lucide/svelte/icons/eye-off'

	interface Props {
		field: RemoteFormField<any>
		label?: string
		type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'textarea'
		reveal?: boolean
		description?: string
		class?: string
		[key: string]: unknown
	}
	let {
		field,
		label = '',
		type = 'text',
		reveal = $bindable(false),
		description = '',
		class: className = '',
		...rest
	}: Props = $props()

	// shadcn Input / Textarea class strings (copied verbatim from laroastingco InputText.svelte).
	const inputClass =
		'border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
	const textareaClass =
		'border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

	const issues = $derived(field.issues())
	const invalid = $derived(issues && issues.length > 0 ? 'true' : undefined)
	// `name` is type-independent, so 'text' just fetches a stable id for label association.
	const name = $derived(field.as('text').name)
</script>

<Field.Field data-invalid={invalid}>
	{#if label}<Field.FieldLabel for={name}>{label}</Field.FieldLabel>{/if}
	{#if type === 'textarea'}
		<textarea id={name} {...field.as('text')} class={cn(textareaClass, className)} {...rest}></textarea>
	{:else if type === 'password'}
		<div class="relative">
			<input id={name} {...field.as(reveal ? 'text' : 'password')} class={cn(inputClass, 'pr-10', className)} {...rest} />
			<button
				type="button"
				tabindex={-1}
				class="text-muted-foreground absolute inset-y-0 right-0 flex items-center pr-3"
				aria-label={reveal ? 'Hide' : 'Show'}
				onclick={() => (reveal = !reveal)}
			>
				{#if reveal}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
			</button>
		</div>
	{:else}
		<input id={name} {...field.as(type)} class={cn(inputClass, className)} {...rest} />
	{/if}
	{#if description}<Field.FieldDescription>{description}</Field.FieldDescription>{/if}
	<Field.FieldError errors={issues} />
</Field.Field>
