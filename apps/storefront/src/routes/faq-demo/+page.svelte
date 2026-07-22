<script lang="ts">
	import * as Faq from '$lib/components/ui/faq'
	import Plus from '@lucide/svelte/icons/plus'
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'
	import { faqs } from './faqs'
</script>

<div class="mx-auto max-w-3xl space-y-12 p-8" data-testid="faq-demo">
	<div class="flex items-center gap-6" data-testid="theme-switchers">
		<ThemeButton />
	</div>

	<h1 class="text-center text-3xl font-semibold">Frequently Asked Questions</h1>

	<!-- Apnea-style: Plus→× icon, per-trigger top border, white/#f2f2f2 backgrounds,
	     rounded-xl white shadowed container, large type — all via class + props,
	     without forking the accordion. -->
	<Faq.Root type="multiple" class="mx-auto w-full overflow-hidden rounded-b-xl bg-white shadow-lg">
		{#each faqs as f (f.value)}
			<Faq.Item value={f.value} class="overflow-hidden transition-colors">
				<Faq.Question
					iconRotate={45}
					class="items-start rounded-none border-t border-t-neutral-300 bg-white px-5 py-5 text-start text-2xl leading-none text-neutral-900 hover:no-underline aria-expanded:bg-[#f2f2f2]"
				>
					{f.title}
					{#snippet icon()}
						<Plus class="size-6 translate-y-0.5 text-muted-foreground" />
					{/snippet}
				</Faq.Question>
				<Faq.Answer class="bg-[#f2f2f2] px-5 pt-2 pb-8 text-lg text-neutral-600">
					{@html f.description}
				</Faq.Answer>
			</Faq.Item>
		{/each}
	</Faq.Root>
</div>
