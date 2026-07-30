<script lang="ts">
	import * as Collections from '$lib/components/ui/collections'
</script>

<h1 class="mb-6 text-2xl font-semibold">Collections</h1>

<Collections.Root pageSize={12}>
	{#snippet children({ count })}
		<p class="mb-4 text-sm text-muted-foreground">{count} collections</p>
		<Collections.Grid>
			{#snippet empty()}<p>No collections found.</p>{/snippet}
		</Collections.Grid>
		<div class="mt-8">
			<Collections.Pagination />
		</div>
	{/snippet}
</Collections.Root>
