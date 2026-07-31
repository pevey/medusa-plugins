// Browser-test stand-in for `../../modules/content/models/content-relationship.ts` -- see
// `./content-collection.ts` for why. `validators.ts` only needs `ContentRelationshipType`.
export enum ContentRelationshipType {
	MANY_TO_MANY = 'many_to_many',
	ONE_TO_MANY = 'one_to_many',
	MANY_TO_ONE = 'many_to_one'
}
