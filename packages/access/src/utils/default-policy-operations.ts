import { CLOSED_OPERATIONS, WILDCARD } from './define-policies'

/**
 * Default operations generated for every resource. Derived from the closed set
 * rather than from the `PolicyOperation` registry: reading the registry at
 * import time snapshotted whatever had been declared by that point, which made
 * generated policies depend on module load order.
 */
export const defaultPolicyOperations = CLOSED_OPERATIONS.filter(operation => operation !== WILDCARD)
