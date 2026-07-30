import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

const translationResources = ['translation', 'translation_setting']

export const translationPolicies = definePolicies(generateResourcePolicies(translationResources))
