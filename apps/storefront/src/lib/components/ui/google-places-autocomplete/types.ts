export type NormalizedAddress = {
	address_1: string
	address_2: string
	city: string
	province: string
	postal_code: string
	country_code: string
}

export type GpacIcons = {
	search?: boolean
	close?: boolean
	location?: boolean
}

export type GooglePlacesAutocompleteProps = {
	apiKey: string
	placeholder?: string
	initialValue?: string
	icons?: GpacIcons
	fields?: string[]
	class?: string
	// If the handler returns a string, it replaces the visible input value after selection — e.g.
	// collapse the field to just the street line once the other parts are distributed elsewhere.
	onselect?: (address: NormalizedAddress, place: google.maps.places.Place) => void | string | Promise<void | string>
	oninput?: (text: string) => void
}
