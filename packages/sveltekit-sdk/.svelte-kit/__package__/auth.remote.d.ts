import type { AuthResult } from './types';
export declare const login: import("@sveltejs/kit").RemoteForm<{
    email: string;
    password: string;
}, AuthResult>;
export declare const register: import("@sveltejs/kit").RemoteForm<{
    email: string;
    password: string;
}, AuthResult>;
export declare const requestResetPassword: import("@sveltejs/kit").RemoteForm<{
    email: string;
}, AuthResult>;
export declare const resetPassword: import("@sveltejs/kit").RemoteForm<{
    password: string;
    token: string;
}, AuthResult>;
export declare const logout: import("@sveltejs/kit").RemoteCommand<void, AuthResult>;
