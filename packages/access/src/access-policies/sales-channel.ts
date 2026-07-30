import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

const salesChannelResources = ['sales_channel', 'store', 'store_locale']

export const salesChannelPolicies = definePolicies(generateResourcePolicies(salesChannelResources))
