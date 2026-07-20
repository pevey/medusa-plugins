## 2.0.0

- Potentially BREAKING CHANGE: If you have previously configured your R2 endpoints with the bucket name appended, the provider will now automatically strip the bucket name to prevent unecessary nesting (e.g., /bucket-name/bucket-name/image.png)

## 1.1.4

- Shows a warning on startup if your endpoint configuration (options.endpoint) appends the bucket name. Starting in v2.0.0, the bucket name will be stripped by default, requiring a migration of saved objects.

## 1.1.3

- Mirrors the changes made to the Medusa file-s3 provider in PR https://github.com/medusajs/medusa/pull/15811, decode upload content by MIME type to stop binary file corruption

## 1.1.2

- Updated medusa packages to 2.17.2
- Migrated all integration tests to work with changes introduced in @medusajs/test-utils 2.17.0

## 1.1.1

- Upgrade underlying Medusa packages

## 1.1.0

- Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4

## 1.0.4

- Added deleteByUrl() method
- Updated logic for deleting files when minimal fileDTO is provided (e.g., just the fileKey). Will now look for a file using GetObjectCommand (first in public bucket, then private), before trying to delete.
- Added integration tests

## 1.0.2

- Fixed getPresignedDownloadUrl using public bucket client instead of private bucket client

## 1.0.1

- Removed unnecessary dependencies
