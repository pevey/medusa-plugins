import * as v from 'valibot';
/**
 * Checkout schema for the Braintree flow. Exported from a non-`.remote.` module
 * because remote files cannot export schemas. Consumers can reuse or extend it
 * when building their own checkout form. A `stripeCheckoutSchema` will follow.
 */
export declare const braintreeCheckoutSchema: v.ObjectSchema<{
    readonly email: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "Email is required">, v.EmailAction<string, "Invalid email address">]>;
    readonly first_name: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "First name is required">]>;
    readonly last_name: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "Last name is required">]>;
    readonly address_1: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "Address is required">]>;
    readonly address_2: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly city: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "City is required">]>;
    readonly province: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "Province is required">]>;
    readonly country_code: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "Country is required">]>;
    readonly postal_code: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.NonEmptyAction<string, "Postal code is required">]>;
    readonly phone: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_first_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_last_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_address_1: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_address_2: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_city: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_province: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_country_code: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_postal_code: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly billing_phone: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly hideBilling: v.OptionalSchema<v.BooleanSchema<undefined>, true>;
    readonly extra: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
