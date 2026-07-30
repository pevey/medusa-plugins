<script lang="ts">
	import * as Categories from '$lib/components/ui/categories'
</script>

<h1 class="mb-6 text-2xl font-semibold">Categories</h1>

<!--
	Headless: no Categories.Grid and no Categories.Card — the Root's render-prop hands over the
	page of categories and we render whatever we like. Pagination still works, because it reads
	the same context the Root provides.
-->
<Categories.Root pageSize={12}>
	{#snippet children({ categories, count, loading })}
		<p class="mb-4 text-sm text-muted-foreground">{loading ? 'Loading…' : `${count} categories`}</p>

		{#if categories.length}
			<ul class="divide-y rounded-lg border">
				{#each categories as category (category.id)}
					<li>
						<a href="/categories/{category.handle}" class="flex items-baseline justify-between gap-4 p-4 hover:bg-accent">
							<span class="font-medium">{category.name}</span>
							{#if category.description}
								<span class="truncate text-sm text-muted-foreground">{category.description}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{:else if !loading}
			<p>No categories found.</p>
		{/if}

		<div class="mt-8">
			<Categories.Pagination />
		</div>
	{/snippet}
</Categories.Root>
