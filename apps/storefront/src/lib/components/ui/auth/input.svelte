<script lang="ts">
  import Eye from '@lucide/svelte/icons/eye'
  import EyeOff from '@lucide/svelte/icons/eye-off'
  import { cn } from '$lib/utils.js'
  import { getAuthFieldContext } from './ctx.svelte.js'
  import { AUTH_INPUT_CLASS } from './auth-input-class.js'

  let { type = 'text', reveal = $bindable(false), class: className = '', ...rest }:
    { type?: 'text' | 'email' | 'tel' | 'password'; reveal?: boolean; class?: string; [k: string]: unknown } = $props()
  const ctx = getAuthFieldContext()
</script>

{#if type === 'password'}
  <div class="relative">
    <input id={ctx.name} {...ctx.field.as(reveal ? 'text' : 'password')} class={cn(AUTH_INPUT_CLASS, 'pr-10', className)} {...rest} />
    <button type="button" tabindex={-1} class="text-muted-foreground absolute inset-y-0 right-0 flex items-center pr-3" aria-label={reveal ? 'Hide' : 'Show'} onclick={() => (reveal = !reveal)}>
      {#if reveal}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
    </button>
  </div>
{:else}
  <input id={ctx.name} {...ctx.field.as(type)} class={cn(AUTH_INPUT_CLASS, className)} {...rest} />
{/if}
