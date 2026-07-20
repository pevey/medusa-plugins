<script lang="ts">
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'
	import ThemeToggle from '$lib/components/ui/theme/theme-toggle.svelte'
	import ThemeSwitch from '$lib/components/ui/theme/theme-switch.svelte'
	import ThemeSelect from '$lib/components/ui/theme/theme-select.svelte'
</script>

<div class="mx-auto max-w-2xl space-y-10 p-8" data-testid="theme-demo">
	<h1 class="text-2xl font-bold">Theme switchers</h1>
	<p class="text-sm text-muted-foreground">
		Each control changes the theme immediately. (<code>&lt;ModeWatcher /&gt;</code> is in the root layout.)
	</p>

	<section data-testid="theme-button" class="flex items-center gap-4">
		<span class="w-28 text-sm text-muted-foreground">ThemeButton</span>
		<ThemeButton />
	</section>

	<section data-testid="theme-toggle" class="flex items-center gap-4">
		<span class="w-28 text-sm text-muted-foreground">ThemeToggle</span>
		<ThemeToggle label="Theme" />
	</section>

	<section data-testid="theme-switch" class="flex items-center gap-4">
		<span class="w-28 text-sm text-muted-foreground">ThemeSwitch</span>
		<ThemeSwitch />
	</section>

	<section data-testid="theme-select" class="flex items-center gap-4">
		<span class="w-28 text-sm text-muted-foreground">ThemeSelect</span>
		<ThemeSelect />
	</section>
</div>
