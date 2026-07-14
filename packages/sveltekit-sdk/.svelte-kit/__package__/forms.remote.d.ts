/**
 * Generic form-submission primitive (requires the forms plugin on the backend).
 * Consumers build their own `form(schema, ...)` wrappers that call this with a
 * form handle, the submitted data, and an optional verification token.
 */
export declare const submitForm: import("@sveltejs/kit").RemoteCommand<{
    handle: string;
    data: {
        [x: string]: unknown;
    };
    token?: string | undefined;
}, import("@pevey/medusa-sdk").FormSubmitResponse>;
