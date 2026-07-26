<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { cn } from '$lib/utils.js'
  import { getAuthFormContext } from './ctx.svelte.js'
  let { class: className = '', children }: { class?: string; children: Snippet } = $props()
  const ctx = getAuthFormContext()
</script>

<Button type="submit" disabled={ctx.submitting} class={cn('w-full', className)}>{@render children()}</Button>
