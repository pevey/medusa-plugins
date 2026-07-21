import type { NormalizedAddress } from './types'

export function componentsToAddress(
	components: google.maps.places.AddressComponent[]
): NormalizedAddress {
	const find = (type: string, key: 'longText' | 'shortText' = 'longText') =>
		components.find((c) => c.types.includes(type))?.[key] ?? ''
	return {
		address_1: `${find('street_number')} ${find('route')}`.trim(),
		address_2: find('subpremise'),
		city: find('locality') || find('postal_town'),
		province: find('administrative_area_level_1'),
		postal_code: find('postal_code'),
		country_code: (find('country', 'shortText') || '').toLowerCase()
	}
}
