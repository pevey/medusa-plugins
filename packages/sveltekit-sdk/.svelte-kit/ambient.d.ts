
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const CHROME_DESKTOP: string;
	export const CUDA_PATH: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const DEBUGINFOD_URLS: string;
	export const DESKTOP_SESSION: string;
	export const DISPLAY: string;
	export const ELECTRON_NO_ATTACH_CONSOLE: string;
	export const FC_FONTATIONS: string;
	export const GBM_BACKEND: string;
	export const GDK_BACKEND: string;
	export const GTK2_RC_FILES: string;
	export const GTK_RC_FILES: string;
	export const HOME: string;
	export const ICEAUTHORITY: string;
	export const INVOCATION_ID: string;
	export const JOURNAL_STREAM: string;
	export const KDE_APPLICATIONS_AS_SCOPE: string;
	export const KDE_FULL_SESSION: string;
	export const KDE_SESSION_UID: string;
	export const KDE_SESSION_VERSION: string;
	export const LANG: string;
	export const LOGNAME: string;
	export const MAIL: string;
	export const MANAGERPID: string;
	export const MANAGERPIDFDID: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const MOTD_SHOWN: string;
	export const NO_AT_BRIDGE: string;
	export const NVCC_CCBIN: string;
	export const PAM_KWALLET5_LOGIN: string;
	export const PATH: string;
	export const PWD: string;
	export const QT_WAYLAND_RECONNECT: string;
	export const SESSION_MANAGER: string;
	export const SHELL: string;
	export const SHLVL: string;
	export const SYSTEMD_EXEC_PID: string;
	export const USER: string;
	export const VSCODE_CLI: string;
	export const VSCODE_CODE_CACHE_PATH: string;
	export const VSCODE_CRASH_REPORTER_PROCESS_TYPE: string;
	export const VSCODE_CWD: string;
	export const VSCODE_ESM_ENTRYPOINT: string;
	export const VSCODE_HANDLES_UNCAUGHT_ERRORS: string;
	export const VSCODE_IPC_HOOK: string;
	export const VSCODE_NLS_CONFIG: string;
	export const VSCODE_PID: string;
	export const VSSCRIPT_PATH: string;
	export const WAYLAND_DISPLAY: string;
	export const XAUTHORITY: string;
	export const XDG_CONFIG_DIRS: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const XDG_DATA_DIRS: string;
	export const XDG_MENU_PREFIX: string;
	export const XDG_RUNTIME_DIR: string;
	export const XDG_SEAT: string;
	export const XDG_SEAT_PATH: string;
	export const XDG_SESSION_CLASS: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XDG_SESSION_ID: string;
	export const XDG_SESSION_PATH: string;
	export const XDG_SESSION_TYPE: string;
	export const XDG_VTNR: string;
	export const XKB_DEFAULT_LAYOUT: string;
	export const XKB_DEFAULT_MODEL: string;
	export const XKB_DEFAULT_OPTIONS: string;
	export const _: string;
	export const _JAVA_AWT_WM_NONREPARENTING: string;
	export const __GLX_VENDOR_LIBRARY_NAME: string;
	export const ELECTRON_RUN_AS_NODE: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const VSCODE_L10N_BUNDLE_LOCATION: string;
	export const CLAUDE_AGENT_SDK_VERSION: string;
	export const APPLICATION_INSIGHTS_NO_STATSBEAT: string;
	export const NODE_TLS_REJECT_UNAUTHORIZED: string;
	export const MXC_BIN_DIR: string;
	export const COPILOT_CLI_ENABLED_FEATURE_FLAGS: string;
	export const GIT_CONFIG_COUNT: string;
	export const GIT_CONFIG_KEY_0: string;
	export const GIT_CONFIG_VALUE_0: string;
	export const COPILOT_OTEL_FILE_EXPORTER_PATH: string;
	export const VITEST_VSCODE_LOG: string;
	export const VITEST_VSCODE: string;
	export const TEST: string;
	export const VITEST_WS_ADDRESS: string;
	export const VITEST: string;
	export const NODE_ENV: string;
	export const FORCE_COLOR: string;
	export const PROD: string;
	export const DEV: string;
	export const BASE_URL: string;
	export const MODE: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		CHROME_DESKTOP: string;
		CUDA_PATH: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		DEBUGINFOD_URLS: string;
		DESKTOP_SESSION: string;
		DISPLAY: string;
		ELECTRON_NO_ATTACH_CONSOLE: string;
		FC_FONTATIONS: string;
		GBM_BACKEND: string;
		GDK_BACKEND: string;
		GTK2_RC_FILES: string;
		GTK_RC_FILES: string;
		HOME: string;
		ICEAUTHORITY: string;
		INVOCATION_ID: string;
		JOURNAL_STREAM: string;
		KDE_APPLICATIONS_AS_SCOPE: string;
		KDE_FULL_SESSION: string;
		KDE_SESSION_UID: string;
		KDE_SESSION_VERSION: string;
		LANG: string;
		LOGNAME: string;
		MAIL: string;
		MANAGERPID: string;
		MANAGERPIDFDID: string;
		MEMORY_PRESSURE_WATCH: string;
		MEMORY_PRESSURE_WRITE: string;
		MOTD_SHOWN: string;
		NO_AT_BRIDGE: string;
		NVCC_CCBIN: string;
		PAM_KWALLET5_LOGIN: string;
		PATH: string;
		PWD: string;
		QT_WAYLAND_RECONNECT: string;
		SESSION_MANAGER: string;
		SHELL: string;
		SHLVL: string;
		SYSTEMD_EXEC_PID: string;
		USER: string;
		VSCODE_CLI: string;
		VSCODE_CODE_CACHE_PATH: string;
		VSCODE_CRASH_REPORTER_PROCESS_TYPE: string;
		VSCODE_CWD: string;
		VSCODE_ESM_ENTRYPOINT: string;
		VSCODE_HANDLES_UNCAUGHT_ERRORS: string;
		VSCODE_IPC_HOOK: string;
		VSCODE_NLS_CONFIG: string;
		VSCODE_PID: string;
		VSSCRIPT_PATH: string;
		WAYLAND_DISPLAY: string;
		XAUTHORITY: string;
		XDG_CONFIG_DIRS: string;
		XDG_CURRENT_DESKTOP: string;
		XDG_DATA_DIRS: string;
		XDG_MENU_PREFIX: string;
		XDG_RUNTIME_DIR: string;
		XDG_SEAT: string;
		XDG_SEAT_PATH: string;
		XDG_SESSION_CLASS: string;
		XDG_SESSION_DESKTOP: string;
		XDG_SESSION_ID: string;
		XDG_SESSION_PATH: string;
		XDG_SESSION_TYPE: string;
		XDG_VTNR: string;
		XKB_DEFAULT_LAYOUT: string;
		XKB_DEFAULT_MODEL: string;
		XKB_DEFAULT_OPTIONS: string;
		_: string;
		_JAVA_AWT_WM_NONREPARENTING: string;
		__GLX_VENDOR_LIBRARY_NAME: string;
		ELECTRON_RUN_AS_NODE: string;
		NoDefaultCurrentDirectoryInExePath: string;
		VSCODE_L10N_BUNDLE_LOCATION: string;
		CLAUDE_AGENT_SDK_VERSION: string;
		APPLICATION_INSIGHTS_NO_STATSBEAT: string;
		NODE_TLS_REJECT_UNAUTHORIZED: string;
		MXC_BIN_DIR: string;
		COPILOT_CLI_ENABLED_FEATURE_FLAGS: string;
		GIT_CONFIG_COUNT: string;
		GIT_CONFIG_KEY_0: string;
		GIT_CONFIG_VALUE_0: string;
		COPILOT_OTEL_FILE_EXPORTER_PATH: string;
		VITEST_VSCODE_LOG: string;
		VITEST_VSCODE: string;
		TEST: string;
		VITEST_WS_ADDRESS: string;
		VITEST: string;
		NODE_ENV: string;
		FORCE_COLOR: string;
		PROD: string;
		DEV: string;
		BASE_URL: string;
		MODE: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
