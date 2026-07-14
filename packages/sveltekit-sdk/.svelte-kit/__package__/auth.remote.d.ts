export declare const login: import("@sveltejs/kit").RemoteForm<{
    email: string;
    password: string;
}, {
    success: boolean;
}>;
export declare const logout: import("@sveltejs/kit").RemoteCommand<void, void>;
