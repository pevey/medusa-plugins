import {
  getCallerFilePath,
  isFileDisabled,
  MEDUSA_SKIP_FILE,
  toSnakeCase,
} from "@medusajs/framework/utils"

export const AccessPolicySymbol = Symbol.for("AccessPolicy")

/**
 * The single character used as the wildcard across both resource and operation
 * slots. All access-policy code that reads/writes/compares the wildcard imports this.
 */
export const WILDCARD = "*"

export interface PolicyDefinition {
  name: string
  resource: string
  operation: string
  description?: string
}

export interface definePoliciesExport {
  [AccessPolicySymbol]: boolean
  policies: PolicyDefinition[]
}

declare global {
  // eslint-disable-next-line no-var
  var AccessPolicy:
    | Record<string, { resource: string; operation: string; description?: string }>
    | undefined
  // eslint-disable-next-line no-var
  var AccessPolicyResource: Record<string, string> | undefined
  // eslint-disable-next-line no-var
  var AccessPolicyOperation: (Record<string, string> & { ALL: string }) | undefined
}

type DefaultPolicyResources = Record<string, string>

const PolicyResource: DefaultPolicyResources & Record<string, string> =
  global.AccessPolicyResource ?? {}
global.AccessPolicyResource ??= PolicyResource

const defaultOperations = ["read", "create", "update", "delete", WILDCARD]

const PolicyOperation: Record<string, string> & {
  readonly read: "read"
  readonly create: "create"
  readonly update: "update"
  readonly delete: "delete"
  readonly "*": "*"
  readonly ALL: "*"
} = (global.AccessPolicyOperation as any) ?? { ALL: WILDCARD }

const normalizeKey = (element: string) =>
  element === WILDCARD ? WILDCARD : toSnakeCase(element)

for (const operation of defaultOperations) {
  const operationKey = normalizeKey(operation)
  PolicyOperation[operationKey] = operation
}
global.AccessPolicyOperation ??= PolicyOperation

const Policy: Record<
  string,
  { resource: string; operation: string; description?: string }
> = global.AccessPolicy ?? {}
global.AccessPolicy ??= Policy

/**
 * Define access-control policies that are synced to the DB when the app starts
 * (sync happens in a later phase). Registers into the independent Access* registries.
 */
export function definePolicies(
  policies: PolicyDefinition | PolicyDefinition[]
): definePoliciesExport {
  const callerFilePath = getCallerFilePath()
  if (isFileDisabled(callerFilePath ?? "")) {
    return { [MEDUSA_SKIP_FILE]: true } as any
  }

  const policiesArray = Array.isArray(policies) ? policies : [policies]

  for (const policy of policiesArray) {
    if (!policy.name || !policy.resource || !policy.operation) {
      throw new Error(
        `Policy definition must include name, resource, and operation. Received: ${JSON.stringify(
          policy,
          null,
          2
        )}`
      )
    }
  }

  for (const policy of policiesArray) {
    const resourceKey = normalizeKey(policy.resource)
    const operationKey = normalizeKey(policy.operation)

    policy.resource = resourceKey
    policy.operation = operationKey

    PolicyResource[resourceKey] = policy.resource
    PolicyOperation[operationKey] = policy.operation
    Policy[policy.name] = { ...policy }
  }

  return {
    [AccessPolicySymbol]: true,
    policies: policiesArray,
  }
}

export { Policy, PolicyOperation, PolicyResource }
