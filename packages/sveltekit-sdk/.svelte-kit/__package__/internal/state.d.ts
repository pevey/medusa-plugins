import Medusa from '@pevey/medusa-sdk';
import type { MedusaHandleConfig, ResolvedConfig } from '../types';
/** Configure the shared client once. Idempotent — the first call wins. */
export declare function setConfig(raw: MedusaHandleConfig): void;
export declare function getClient(): Medusa;
export declare function getConfig(): ResolvedConfig;
/**
 * A fresh, throwaway client for the login handshake. Using a separate instance
 * keeps the shared client's auth state untouched (no cross-request token bleed).
 * `type: 'jwt'` makes `auth.login` return the token without an internal session
 * exchange, so we capture the `Set-Cookie` ourselves.
 */
export declare function createAuthClient(): Medusa;
/** Test-only: reset module state between tests. */
export declare function __resetForTest(): void;
