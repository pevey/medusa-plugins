<script lang="ts">
  import type { Snippet } from 'svelte'
  import * as Field from '$lib/components/ui/field/index.js'
  import { cn } from '$lib/utils.js'
  import { getAuthFormContext, setAuthFieldContext } from './ctx.svelte.js'

  let { name, class: className = '', children }:
    { name: string; class?: string; children: Snippet } = $props()

  const form = getAuthFormContext()
  const field = $derived(form.form.fields[name])
  const invalid = $derived((field?.issues()?.length ?? 0) > 0 ? 'true' : undefined)
  // `.as('text').name` is the stable field id used for label association (type-independent).
  const resolvedName = $derived(field?.as('text').name ?? name)

  setAuthFieldContext({
    get field() { return field },
    get name() { return resolvedName }
  })
</script>

<Field.Field data-invalid={invalid} class={cn('', className)}>
  {@render children()}
</Field.Field>
