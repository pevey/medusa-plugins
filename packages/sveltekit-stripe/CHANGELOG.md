# Change Log

## 3.1.3

- Small tweaks updates to internal types

## 3.1.2

- Remove unneeded import in Payment Element
- Remove console.log() call from Payment Element and Address Element.  Will still log errors to console in dev mode.

## 3.1.1

- Bump all dependencies to latest
- Small tweaks to help ensure elements lib is loaded before Payment or Address Elements attempt to render.

## 3.0.1

- Update README
- No other changes

## 3.0.0

- Changed usage pattern to allow creation of elements without a payment or setup intent, in line with Stripe updates to the API.  See updated examples in README.

## 2.1.1

- Upgrade package dependencies
- Custom on:complete now returns the name and address object instead of just the address object.

## 2.0.5

- Update README
- No other changes

## 2.0.3

- Breaking Change from v1.x: PaymentOptions property renamed to PaymentElementOptions, and AddressOptions renamed to AddressElementOptions.
- Added a custom event for the Address Element that triggers when an address in entered with complete information.  This is useful for streamlining multi-step checkout pages.
- Bumped all dependencies to latest
- Removed PricingTable component
- Moved to Typescript
- Better typing of $stripeClient and $stripeElements
- Typescript will no longer complain if you use the AddressElement in your app without using the addressContainer property.
- This package now re-exports the types { Appearance, Stripe, StripeAddressElementOptions, StripePaymentElementOptions } from stripe-js for convenience.  If you define your appearance and element options elsewhere to be passed into the coponent as props, use these types for tooltips on available properties.

## 1.1.0

- Bump versions on all dependencies to latest

## 1.0.2

- Handle refreshing of client secret in stripeElement store in SPAs, where onDestroy does not seem to be reliably called

## 1.0.0

- Initial Release