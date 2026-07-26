<script lang="ts">
  import type { Snippet } from 'svelte'
  import * as Field from '$lib/components/ui/field/index.js'
  import { cn } from '$lib/utils.js'
  import { getAuthFieldContext } from './ctx.svelte.js'
  let { class: className = '', children }: { class?: string; children: Snippet } = $props()
  const ctx = getAuthFieldContext()
</script>

<Field.FieldLabel for={ctx.name} class={cn('', className)}>{@render children()}</Field.FieldLabel>
