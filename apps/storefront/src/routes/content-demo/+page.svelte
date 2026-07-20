<script lang="ts">
	import Markdown from '$lib/components/ui/markdown/markdown.svelte'
	let { data } = $props()
</script>

<main class="mx-auto max-w-3xl px-4 py-12">
	<h1 class="mb-8 text-3xl font-bold">{data.title}</h1>
	<Markdown html={data.html} />
</main>
