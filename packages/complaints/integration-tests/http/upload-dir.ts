import os from 'os'
import path from 'path'

/**
 * Directory the local file-storage provider is redirected to for dev/test runs.
 *
 * `@medusajs/file-local` defaults both `upload_dir` and `private_upload_dir` to
 * `path.join(process.cwd(), 'static')`. Integration tests run with `cwd` set to
 * this package directory, so without this override every uploaded file (e.g. the
 * pdf-export route's generated PDFs) lands in `packages/complaints/static/` and
 * gets left behind on disk.
 *
 * Imported by `medusa-config.ts` (to configure the provider) and by
 * `complaints.spec.ts` (to recursively remove it in `afterAll` as a backstop).
 * Keep this the single source of truth for the path so the two can't drift.
 */
export const TEST_UPLOAD_DIR = path.join(os.tmpdir(), 'medusa-plugin-complaints-uploads')
