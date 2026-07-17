## 0.2.5

- Add option to prerender markdown format content items as html by appending the query param ?render-html
- Fix major admin UI bug introducted in 0.2.2 that caused posting from the create-content-item-modal to fail because it was sending a redundant field that caused validation to reject

## 0.2.4

- Updated medusa packages to 2.17.2
- Migrated all integration tests to work with changes introduced in @medusajs/test-utils 2.17.0

## 0.2.3

- Added 'searchable' boolean field to content-collection data model for easier configuration when generating search documents that should include only certain content items.
- Add content-item.created/updated/deleted and content-collection.updated event emitters to allow subscribing to those events to update search documents.

## 0.2.2

- Make create and edit forms more consistent across plugins

## 0.2.1

- Upgrade underlying Medusa packages

## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4
