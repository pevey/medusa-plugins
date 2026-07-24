import type { SelectOption } from '../input-select/input-select.svelte'

export type ProvinceConfig = Record<string, { label: string; options: SelectOption[] }>

// ISO 3166-2:US subdivision codes (lower-cased) → display names.
export const US_STATES: SelectOption[] = [
	{ value: 'us-al', label: 'Alabama' }, { value: 'us-ak', label: 'Alaska' },
	{ value: 'us-az', label: 'Arizona' }, { value: 'us-ar', label: 'Arkansas' },
	{ value: 'us-ca', label: 'California' }, { value: 'us-co', label: 'Colorado' },
	{ value: 'us-ct', label: 'Connecticut' }, { value: 'us-de', label: 'Delaware' },
	{ value: 'us-fl', label: 'Florida' }, { value: 'us-ga', label: 'Georgia' },
	{ value: 'us-hi', label: 'Hawaii' }, { value: 'us-id', label: 'Idaho' },
	{ value: 'us-il', label: 'Illinois' }, { value: 'us-in', label: 'Indiana' },
	{ value: 'us-ia', label: 'Iowa' }, { value: 'us-ks', label: 'Kansas' },
	{ value: 'us-ky', label: 'Kentucky' }, { value: 'us-la', label: 'Louisiana' },
	{ value: 'us-me', label: 'Maine' }, { value: 'us-md', label: 'Maryland' },
	{ value: 'us-ma', label: 'Massachusetts' }, { value: 'us-mi', label: 'Michigan' },
	{ value: 'us-mn', label: 'Minnesota' }, { value: 'us-ms', label: 'Mississippi' },
	{ value: 'us-mo', label: 'Missouri' }, { value: 'us-mt', label: 'Montana' },
	{ value: 'us-ne', label: 'Nebraska' }, { value: 'us-nv', label: 'Nevada' },
	{ value: 'us-nh', label: 'New Hampshire' }, { value: 'us-nj', label: 'New Jersey' },
	{ value: 'us-nm', label: 'New Mexico' }, { value: 'us-ny', label: 'New York' },
	{ value: 'us-nc', label: 'North Carolina' }, { value: 'us-nd', label: 'North Dakota' },
	{ value: 'us-oh', label: 'Ohio' }, { value: 'us-ok', label: 'Oklahoma' },
	{ value: 'us-or', label: 'Oregon' }, { value: 'us-pa', label: 'Pennsylvania' },
	{ value: 'us-ri', label: 'Rhode Island' }, { value: 'us-sc', label: 'South Carolina' },
	{ value: 'us-sd', label: 'South Dakota' }, { value: 'us-tn', label: 'Tennessee' },
	{ value: 'us-tx', label: 'Texas' }, { value: 'us-ut', label: 'Utah' },
	{ value: 'us-vt', label: 'Vermont' }, { value: 'us-va', label: 'Virginia' },
	{ value: 'us-wa', label: 'Washington' }, { value: 'us-wv', label: 'West Virginia' },
	{ value: 'us-wi', label: 'Wisconsin' }, { value: 'us-wy', label: 'Wyoming' },
	{ value: 'us-dc', label: 'District of Columbia' },
	{ value: 'us-as', label: 'American Samoa' }, { value: 'us-gu', label: 'Guam' },
	{ value: 'us-mp', label: 'Northern Mariana Islands' }, { value: 'us-pr', label: 'Puerto Rico' },
	{ value: 'us-vi', label: 'U.S. Virgin Islands' }
]

// Military "state" codes for APO/FPO/DPO shipping. Not ISO 3166-2 — opt-in by spreading into config.
export const US_MILITARY: SelectOption[] = [
	{ value: 'us-aa', label: 'Armed Forces Americas (AA)' },
	{ value: 'us-ae', label: 'Armed Forces Europe (AE)' },
	{ value: 'us-ap', label: 'Armed Forces Pacific (AP)' }
]

// ISO 3166-2:CA subdivision codes (lower-cased) → display names.
export const CA_PROVINCES: SelectOption[] = [
	{ value: 'ca-ab', label: 'Alberta' }, { value: 'ca-bc', label: 'British Columbia' },
	{ value: 'ca-mb', label: 'Manitoba' }, { value: 'ca-nb', label: 'New Brunswick' },
	{ value: 'ca-nl', label: 'Newfoundland and Labrador' }, { value: 'ca-ns', label: 'Nova Scotia' },
	{ value: 'ca-nt', label: 'Northwest Territories' }, { value: 'ca-nu', label: 'Nunavut' },
	{ value: 'ca-on', label: 'Ontario' }, { value: 'ca-pe', label: 'Prince Edward Island' },
	{ value: 'ca-qc', label: 'Quebec' }, { value: 'ca-sk', label: 'Saskatchewan' },
	{ value: 'ca-yt', label: 'Yukon' }
]

export const defaultProvinceConfig: ProvinceConfig = {
	us: { label: 'State', options: US_STATES },
	ca: { label: 'Province', options: CA_PROVINCES }
}

/** Pick select-vs-text for the current country. Config entries are keyed by lower-case country code. */
export function resolveProvince(
	config: ProvinceConfig,
	country: string | undefined
): { mode: 'select'; label: string; options: SelectOption[] } | { mode: 'text' } {
	const entry = country ? config[country.toLowerCase()] : undefined
	return entry ? { mode: 'select', label: entry.label, options: entry.options } : { mode: 'text' }
}

/**
 * Map a province string (an ISO code OR a full display name, e.g. from Google Places) to the
 * configured option `value` for `country`. Returns the input unchanged for freeform countries
 * (no config entry) or when nothing matches, so manual and autocomplete entry agree.
 */
export function resolveProvinceValue(config: ProvinceConfig, country: string | undefined, province: string): string {
	if (!province) return province
	const entry = country ? config[country.toLowerCase()] : undefined
	if (!entry) return province
	const p = province.toLowerCase()
	const match = entry.options.find((o) => o.value.toLowerCase() === p || o.label.toLowerCase() === p)
	return match ? match.value : province
}
