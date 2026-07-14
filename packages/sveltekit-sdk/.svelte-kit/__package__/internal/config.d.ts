import type { MedusaHandleConfig, ResolvedConfig } from '../types';
export declare const DEFAULT_COOKIES: {
    readonly session: "sid";
    readonly region: "region";
    readonly country: "country";
    readonly cart: "cartid";
};
export declare function resolveConfig(config: MedusaHandleConfig): ResolvedConfig;
