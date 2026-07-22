import { getContext, setContext } from 'svelte'
import { search as sdkSearch } from 'sveltekit-medusa-sdk'

export type SearchHit = {
	type: 'product' | 'category' | 'collection' | 'content' | (string & {})
	id: string
	slug: string
	group_slug: string | null
	title: string
	snippet: string | null
	score: number
}

export type SearchFn = (args: { q: string; limit?: number }) => Promise<{ hits: SearchHit[] }>

// A rendered result section. `label: null` = the headerless products section.
export type SearchSection = { label: string | null; items: { hit: SearchHit; index: number }[] }

// Editable grouping config. Products always render first, headerless; other types
// are grouped under headings in this order, then any unknown types Title-Cased.
const GROUP_LABELS: Record<string, string> = {
	category: 'Categories',
	collection: 'Collections',
	content: 'Pages'
}
const GROUP_ORDER = ['category', 'collection', 'content']
const titleCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// Single source of the tunable defaults — Root/search-box pass `undefined` through
// rather than re-declaring these, so the preset can never drift from the compound path.
const DEFAULT_MIN_LENGTH = 2
const DEFAULT_DEBOUNCE = 200

const KEY = Symbol('search')

export class SearchState {
	query = $state('')
	hits = $state<SearchHit[]>([])
	loading = $state(false)
	open = $state(false)
	// Active option index for keyboard navigation (-1 = none highlighted).
	activeIndex = $state(-1)
	// Whether results act as an ARIA combobox popup (dropdown) vs a plain list
	// (static full-page). Set by Search.Results from its `static` prop.
	combobox = $state(true)

	minLength: number
	debounce: number
	limit: number | undefined
	search: SearchFn
	// Per-instance base id (from Search.Root's $props.id()) used to derive the
	// input / listbox / option ids that wire the combobox together.
	baseId: string

	#timer: ReturnType<typeof setTimeout> | undefined
	#reqId = 0

	constructor(
		opts: {
			search?: SearchFn
			minLength?: number
			debounce?: number
			limit?: number
			baseId?: string
		} = {}
	) {
		this.search = opts.search ?? (sdkSearch as unknown as SearchFn)
		this.minLength = opts.minLength ?? DEFAULT_MIN_LENGTH
		this.debounce = opts.debounce ?? DEFAULT_DEBOUNCE
		this.limit = opts.limit
		this.baseId = opts.baseId ?? 'search'
	}

	// Sections in visual order: products first (headerless), then non-product types
	// by GROUP_ORDER, then unknown types in first-seen order. Each item carries its
	// flat index so rendering order and keyboard-nav order share one source.
	sections: SearchSection[] = $derived.by(() => {
		const products = this.hits.filter((h) => h.type === 'product')
		const nonProduct = this.hits.filter((h) => h.type !== 'product')
		const types: string[] = []
		for (const t of GROUP_ORDER) if (nonProduct.some((h) => h.type === t)) types.push(t)
		for (const h of nonProduct) if (!types.includes(h.type)) types.push(h.type)

		const sections: SearchSection[] = []
		let index = 0
		if (products.length) {
			sections.push({ label: null, items: products.map((hit) => ({ hit, index: index++ })) })
		}
		for (const t of types) {
			const items = nonProduct.filter((h) => h.type === t).map((hit) => ({ hit, index: index++ }))
			sections.push({ label: GROUP_LABELS[t] ?? titleCase(t), items })
		}
		return sections
	})

	// Flat hit list in the same visual order — indexed by activeIndex.
	orderedHits: SearchHit[] = $derived(this.sections.flatMap((s) => s.items.map((i) => i.hit)))

	get listboxId() {
		return `${this.baseId}-listbox`
	}
	optionId(index: number) {
		return `${this.baseId}-opt-${index}`
	}
	get activeOptionId() {
		return this.activeIndex >= 0 && this.activeIndex < this.orderedHits.length
			? this.optionId(this.activeIndex)
			: undefined
	}
	get activeHit() {
		return this.activeIndex >= 0 && this.activeIndex < this.orderedHits.length
			? this.orderedHits[this.activeIndex]
			: undefined
	}

	// Move the highlight by delta, wrapping. Opens the dropdown. From "none" (-1),
	// down goes to the first option and up to the last.
	moveActive(delta: number) {
		const n = this.orderedHits.length
		if (n === 0) return
		this.open = true
		this.activeIndex =
			this.activeIndex === -1
				? delta > 0
					? 0
					: n - 1
				: (this.activeIndex + delta + n) % n
	}

	resetActive() {
		this.activeIndex = -1
	}

	onInput() {
		this.open = true
		this.activeIndex = -1
		clearTimeout(this.#timer)
		const term = this.query.trim()
		if (term.length < this.minLength) {
			this.hits = []
			this.loading = false
			return
		}
		this.loading = true
		this.#timer = setTimeout(async () => {
			const id = ++this.#reqId
			try {
				const res = await this.search({ q: term, ...(this.limit ? { limit: this.limit } : {}) })
				if (id !== this.#reqId) return
				this.hits = res.hits ?? []
				this.activeIndex = -1
			} catch {
				if (id === this.#reqId) this.hits = []
			} finally {
				if (id === this.#reqId) this.loading = false
			}
		}, this.debounce)
	}

	close() {
		this.open = false
		this.activeIndex = -1
	}
}

export function setSearchContext(state: SearchState) {
	setContext(KEY, state)
}

export function getSearchContext(): SearchState {
	const ctx = getContext<SearchState>(KEY)
	if (!ctx) throw new Error('Search.* must be used within <Search.Root>')
	return ctx
}
