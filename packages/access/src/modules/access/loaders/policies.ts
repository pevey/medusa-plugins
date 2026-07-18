// Side-effect import: executing each definition file's definePolicies() call
// registers the bundled core policy definitions into the global Access policy
// registry. The module's onApplicationStart hook (syncRegisteredPolicies) then
// persists them to the access_policy table.
import "../../../access-policies"

export default async (): Promise<void> => {
  // Registration happens via the import above.
}
