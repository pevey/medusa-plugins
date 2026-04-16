## 1.0.4

- Added deleteByUrl() method
- Updated logic for deleting files when minimal fileDTO is provided (e.g., just the fileKey). Will now look for a file using GetObjectCommand (first in public bucket, then private), before trying to delete.
- Added integration tests

## 1.0.2

- Fixed getPresignedDownloadUrl using public bucket client instead of private bucket client

## 1.0.1

- Removed unnecessary dependencies
