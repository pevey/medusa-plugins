import { readdir } from "fs/promises"
import { join, normalize } from "path"
import { dynamicImport, readDirRecursive } from "@medusajs/framework/utils"
import { AccessPolicySymbol } from "./define-policies"

const excludedFiles = ["index.js", "index.ts"]
const excludedExtensions = [".d.ts", ".d.ts.map", ".js.map"]

function isPolicyExport(value: unknown): boolean {
  return !!value && typeof value === "object" && AccessPolicySymbol in value
}

/**
 * Discover access-policy definitions from `access-policies` directories under
 * `sourcePath` (and subdirectories, up to `maxDepth`). Importing each file
 * executes its `definePolicies()` calls, registering them into the Access* globals.
 */
export async function discoverPoliciesFromDir(
  sourcePath?: string,
  maxDepth: number = 2
): Promise<void> {
  if (!sourcePath) {
    return
  }

  const root = normalize(sourcePath)

  const allEntries = await readDirRecursive(root, {
    ignoreMissing: true,
    maxDepth,
  })

  const policyDirs = allEntries
    .filter((e) => e.isDirectory() && e.name === "access-policies")
    .map((e) => join((e as any).path as string, e.name))

  if (!policyDirs.length) {
    return
  }

  await Promise.all(
    policyDirs.map(async (scanDir) => {
      const entries = await readdir(scanDir, { withFileTypes: true })
      await Promise.all(
        entries.map(async (entry) => {
          if (entry.isDirectory()) {
            return
          }

          if (
            excludedExtensions.some((ext) => entry.name.endsWith(ext)) ||
            excludedFiles.includes(entry.name)
          ) {
            return
          }

          // Import the file - this executes its definePolicies() calls
          const fileExports = await dynamicImport(join(scanDir, entry.name))

          const values = Object.values(fileExports)
          const hasPolicies = values.some((value) => isPolicyExport(value))

          if (!hasPolicies) {
            console.warn(
              `File ${entry.name} in access-policies directory does not export any policies`
            )
          }
        })
      )
    })
  )
}
