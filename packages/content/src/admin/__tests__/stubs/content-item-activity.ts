// Browser-test stand-in for `../../modules/content/models/content-item-activity.ts` -- see
// `./content-collection.ts` for why. `validators.ts` only needs `ContentItemActivityType`.
export enum ContentItemActivityType {
	PUBLISH = 'publish',
	ARCHIVE = 'archive',
	DRAFT = 'draft',
	EDIT = 'edit',
	NOTE = 'note'
}
