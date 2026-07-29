<script lang="ts">
	import InputText from '../input-text/input-text.svelte'
	import { getReviewFormContext } from './review-form-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewFormContext()
</script>

<InputText field={ctx.form.fields.title} label="Title (optional)" class={className} />
