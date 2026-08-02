import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

// `store` / `store_locale` are declared in ./system — they are store-level settings, not
// sales-channel resources. Declaring them twice was harmless (the registry dedupes) but misleading.
const salesChannelResources = ['sales_channel']

export const salesChannelPolicies = definePolicies(generateResourcePolicies(salesChannelResources))
