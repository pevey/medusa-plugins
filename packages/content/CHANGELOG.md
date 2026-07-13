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
