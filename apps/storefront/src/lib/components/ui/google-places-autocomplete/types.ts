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
	onselect?: (address: NormalizedAddress, place: google.maps.places.Place) => void
	oninput?: (text: string) => void
}
