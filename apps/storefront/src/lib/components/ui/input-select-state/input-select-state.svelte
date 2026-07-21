<script module lang="ts">
	import type { SelectOption } from '../input-select/input-select.svelte'
	// ISO 3166-2:US subdivision codes (lower-cased) → display names. No APO/FPO (not ISO 3166-2).
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
</script>

<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit'
	import InputSelect from '../input-select/input-select.svelte'

	interface Props {
		field: RemoteFormField<any>
		label?: string
		placeholder?: string
		class?: string
		onchange?: (event: Event) => void
		[key: string]: unknown
	}
	let { field, label = '', placeholder = '', class: className = '', onchange, ...rest }: Props = $props()
</script>

<InputSelect {field} options={US_STATES} {label} {placeholder} class={className} {onchange} {...rest} />
