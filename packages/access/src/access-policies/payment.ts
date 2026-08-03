import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

// `capture`, `credit_line` and `refund` are referenced by the pinned core route
// map but were never registered here, so no role could hold them and those
// routes admitted only wildcard holders.
const paymentResources = ['payment', 'payment_collection', 'payment_method', 'payment_session', 'refund_reason', 'capture', 'credit_line', 'refund']

export const paymentPolicies = definePolicies(generateResourcePolicies(paymentResources))
