
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
	export const MEDUSA_BACKEND_URL: string;
	export const MEDUSA_PUBLISHABLE_KEY: string;
	export const MEDUSA_DEFAULT_REGION_ID: string;
	export const MEDUSA_DEFAULT_COUNTRY_CODE: string;
	export const SVELTEKIT_FORK: string;
	export const NODE_ENV: string;
	export const TERM_PROGRAM: string;
	export const npm_node_execpath: string;
	export const XKB_DEFAULT_OPTIONS: string;
	export const MAIL: string;
	export const KDE_APPLICATIONS_AS_SCOPE: string;
	export const __GLX_VENDOR_LIBRARY_NAME: string;
	export const JOURNAL_STREAM: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const npm_package_json: string;
	export const NVCC_CCBIN: string;
	export const XDG_RUNTIME_DIR: string;
	export const FC_FONTATIONS: string;
	export const npm_execpath: string;
	export const npm_config_user_agent: string;
	export const MANAGERPIDFDID: string;
	export const XDG_SESSION_ID: string;
	export const XDG_VTNR: string;
	export const NVM_CD_FLAGS: string;
	export const SHLVL: string;
	export const npm_lifecycle_event: string;
	export const DISPLAY: string;
	export const PAM_KWALLET5_LOGIN: string;
	export const GBM_BACKEND: string;
	export const XDG_DATA_DIRS: string;
	export const KDE_SESSION_VERSION: string;
	export const QT_WAYLAND_RECONNECT: string;
	export const COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
	export const SHARP_IGNORE_GLOBAL_LIBVIPS: string;
	export const BERRY_BIN_FOLDER: string;
	export const XAUTHORITY: string;
	export const XDG_SESSION_TYPE: string;
	export const MOTD_SHOWN: string;
	export const LOGNAME: string;
	export const SYSTEMD_EXEC_PID: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const PWD: string;
	export const GTK2_RC_FILES: string;
	export const PNPM_HOME: string;
	export const PROJECT_CWD: string;
	export const OLDPWD: string;
	export const GTK_RC_FILES: string;
	export const SESSION_MANAGER: string;
	export const COLORTERM: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XDG_SESSION_PATH: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const INVOCATION_ID: string;
	export const CUDA_PATH: string;
	export const NVM_INC: string;
	export const PYTHON_BASIC_REPL: string;
	export const KDE_FULL_SESSION: string;
	export const DESKTOP_SESSION: string;
	export const TERM_PROGRAM_VERSION: string;
	export const PYTHONSTARTUP: string;
	export const XDG_CONFIG_DIRS: string;
	export const TERM: string;
	export const NO_AT_BRIDGE: string;
	export const SHELL: string;
	export const COREPACK_ROOT: string;
	export const CLAUDE_CODE_SSE_PORT: string;
	export const VSSCRIPT_PATH: string;
	export const HOME: string;
	export const LANG: string;
	export const _JAVA_AWT_WM_NONREPARENTING: string;
	export const PATH: string;
	export const ICEAUTHORITY: string;
	export const KDE_SESSION_UID: string;
	export const _: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const XDG_SEAT: string;
	export const npm_package_version: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const WAYLAND_DISPLAY: string;
	export const GIT_ASKPASS: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
	export const XDG_SEAT_PATH: string;
	export const DEBUGINFOD_URLS: string;
	export const INIT_CWD: string;
	export const CHROME_DESKTOP: string;
	export const GDK_BACKEND: string;
	export const COPILOT_DEBUG_NONCE: string;
	export const NVM_DIR: string;
	export const NVM_BIN: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const XKB_DEFAULT_MODEL: string;
	export const XDG_SESSION_CLASS: string;
	export const XDG_MENU_PREFIX: string;
	export const XKB_DEFAULT_LAYOUT: string;
	export const npm_package_name: string;
	export const USER: string;
	export const MANAGERPID: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
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
		MEDUSA_BACKEND_URL: string;
		MEDUSA_PUBLISHABLE_KEY: string;
		MEDUSA_DEFAULT_REGION_ID: string;
		MEDUSA_DEFAULT_COUNTRY_CODE: string;
		SVELTEKIT_FORK: string;
		NODE_ENV: string;
		TERM_PROGRAM: string;
		npm_node_execpath: string;
		XKB_DEFAULT_OPTIONS: string;
		MAIL: string;
		KDE_APPLICATIONS_AS_SCOPE: string;
		__GLX_VENDOR_LIBRARY_NAME: string;
		JOURNAL_STREAM: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		npm_package_json: string;
		NVCC_CCBIN: string;
		XDG_RUNTIME_DIR: string;
		FC_FONTATIONS: string;
		npm_execpath: string;
		npm_config_user_agent: string;
		MANAGERPIDFDID: string;
		XDG_SESSION_ID: string;
		XDG_VTNR: string;
		NVM_CD_FLAGS: string;
		SHLVL: string;
		npm_lifecycle_event: string;
		DISPLAY: string;
		PAM_KWALLET5_LOGIN: string;
		GBM_BACKEND: string;
		XDG_DATA_DIRS: string;
		KDE_SESSION_VERSION: string;
		QT_WAYLAND_RECONNECT: string;
		COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
		SHARP_IGNORE_GLOBAL_LIBVIPS: string;
		BERRY_BIN_FOLDER: string;
		XAUTHORITY: string;
		XDG_SESSION_TYPE: string;
		MOTD_SHOWN: string;
		LOGNAME: string;
		SYSTEMD_EXEC_PID: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		PWD: string;
		GTK2_RC_FILES: string;
		PNPM_HOME: string;
		PROJECT_CWD: string;
		OLDPWD: string;
		GTK_RC_FILES: string;
		SESSION_MANAGER: string;
		COLORTERM: string;
		XDG_SESSION_DESKTOP: string;
		XDG_SESSION_PATH: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		INVOCATION_ID: string;
		CUDA_PATH: string;
		NVM_INC: string;
		PYTHON_BASIC_REPL: string;
		KDE_FULL_SESSION: string;
		DESKTOP_SESSION: string;
		TERM_PROGRAM_VERSION: string;
		PYTHONSTARTUP: string;
		XDG_CONFIG_DIRS: string;
		TERM: string;
		NO_AT_BRIDGE: string;
		SHELL: string;
		COREPACK_ROOT: string;
		CLAUDE_CODE_SSE_PORT: string;
		VSSCRIPT_PATH: string;
		HOME: string;
		LANG: string;
		_JAVA_AWT_WM_NONREPARENTING: string;
		PATH: string;
		ICEAUTHORITY: string;
		KDE_SESSION_UID: string;
		_: string;
		XDG_CURRENT_DESKTOP: string;
		XDG_SEAT: string;
		npm_package_version: string;
		MEMORY_PRESSURE_WATCH: string;
		WAYLAND_DISPLAY: string;
		GIT_ASKPASS: string;
		MEMORY_PRESSURE_WRITE: string;
		VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
		XDG_SEAT_PATH: string;
		DEBUGINFOD_URLS: string;
		INIT_CWD: string;
		CHROME_DESKTOP: string;
		GDK_BACKEND: string;
		COPILOT_DEBUG_NONCE: string;
		NVM_DIR: string;
		NVM_BIN: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		XKB_DEFAULT_MODEL: string;
		XDG_SESSION_CLASS: string;
		XDG_MENU_PREFIX: string;
		XKB_DEFAULT_LAYOUT: string;
		npm_package_name: string;
		USER: string;
		MANAGERPID: string;
		VSCODE_GIT_IPC_HANDLE: string;
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
