import { PolicyOperation, WILDCARD } from './define-policies'

// Default operations for all resources, sourced from our own operation registry.
export const defaultPolicyOperations = Object.keys(PolicyOperation).filter(key => key !== 'ALL' && key !== WILDCARD)
