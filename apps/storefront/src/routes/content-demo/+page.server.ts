import { getContentItem } from 'sveltekit-medusa-sdk'

// Replace with a real published md-format collection + item slug on your backend.
const COLLECTION_SLUG = 'blog'
const ITEM_SLUG = 'hello-world'

export const load = async () => {
	const { content_item } = await getContentItem({
		slug: COLLECTION_SLUG,
		itemSlug: ITEM_SLUG,
		render: 'html'
	})
	return { html: content_item.body_html ?? '', title: content_item.title }
}
