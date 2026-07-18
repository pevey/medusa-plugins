import { normalize } from "path"
import { discoverPoliciesFromDir } from "./discover-policies"

/**
 * Load access-control policies from a directory (scans for `access-policies` dirs).
 * Invoked from the module's onApplicationStart loader in a later phase.
 */
export async function policiesLoader(sourcePath?: string): Promise<void> {
  if (!sourcePath) {
    return
  }

  const policyDir = normalize(sourcePath)
  await discoverPoliciesFromDir(policyDir)
}
