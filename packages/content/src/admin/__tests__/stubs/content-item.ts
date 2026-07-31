// Browser-test stand-in for `../../modules/content/models/content-item.ts` -- see
// `./content-collection.ts` for why. `validators.ts` only needs `ContentStatus`.
export enum ContentStatus {
	DRAFT = 'draft',
	PUBLISHED = 'published',
	ARCHIVED = 'archived'
}
