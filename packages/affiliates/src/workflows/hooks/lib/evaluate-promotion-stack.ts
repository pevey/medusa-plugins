export type StackInputs = {
	currentCodes: string[]
	incomingCodes: string[]
	affiliateCodes: Set<string>
	allowStacking: boolean
	action: 'add' | 'remove' | 'replace'
}

export type StackDecision = {
	accept: boolean
	codesToRemove: string[]
	reason?: string
}

export function evaluatePromotionStack(input: StackInputs): StackDecision {
	const { currentCodes, incomingCodes, affiliateCodes, allowStacking, action } = input

	if (action === 'remove') {
		return { accept: true, codesToRemove: [] }
	}

	const incomingAffiliate = incomingCodes.filter(c => affiliateCodes.has(c))
	const incomingNonAffiliate = incomingCodes.filter(c => !affiliateCodes.has(c))

	if (incomingAffiliate.length > 1) {
		return {
			accept: false,
			codesToRemove: [],
			reason: 'Only one affiliate code may be applied to a cart.'
		}
	}

	const currentAffiliate = currentCodes.filter(c => affiliateCodes.has(c))
	const currentNonAffiliate = currentCodes.filter(c => !affiliateCodes.has(c))

	if (incomingAffiliate.length === 1) {
		if (currentNonAffiliate.length > 0 && !allowStacking) {
			return {
				accept: false,
				codesToRemove: [],
				reason: 'Affiliate codes cannot be combined with other promotion codes on this store.'
			}
		}
		return {
			accept: true,
			codesToRemove: currentAffiliate
		}
	}

	if (incomingNonAffiliate.length > 0 && currentAffiliate.length > 0 && !allowStacking) {
		return {
			accept: false,
			codesToRemove: [],
			reason: 'This promotion cannot be combined with the affiliate code already on this cart.'
		}
	}

	return { accept: true, codesToRemove: [] }
}
