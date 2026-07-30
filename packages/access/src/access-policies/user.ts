import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

const userResources = ['user', 'api_key', 'invite', 'access_role', 'access_policy']

export const userPolicies = definePolicies(generateResourcePolicies(userResources))
