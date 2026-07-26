<script lang="ts">
  import * as Field from '$lib/components/ui/field/index.js'
  import { cn } from '$lib/utils.js'
  import { getAuthFieldContextOptional, getAuthFormContextOptional } from './ctx.svelte.js'
  let { class: className = '' }: { class?: string } = $props()
  const fieldCtx = getAuthFieldContextOptional()
  const formCtx = getAuthFormContextOptional()
  const issues = $derived(fieldCtx ? fieldCtx.field?.issues() : undefined)
  const formError = $derived(!fieldCtx ? (formCtx?.error ?? '') : '')
</script>

{#if fieldCtx}
  <Field.FieldError errors={issues} class={cn('', className)} />
{:else if formError}
  <p role="alert" class={cn('text-destructive text-sm', className)}>{formError}</p>
{/if}
