
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
	export const npm_node_execpath: string;
	export const XKB_DEFAULT_OPTIONS: string;
	export const MAIL: string;
	export const KDE_APPLICATIONS_AS_SCOPE: string;
	export const __GLX_VENDOR_LIBRARY_NAME: string;
	export const CLAUDE_CODE_EXECPATH: string;
	export const GDK_BACKEND: string;
	export const JOURNAL_STREAM: string;
	export const ELECTRON_NO_ATTACH_CONSOLE: string;
	export const MCP_CONNECTION_NONBLOCKING: string;
	export const XDG_RUNTIME_DIR: string;
	export const FC_FONTATIONS: string;
	export const npm_execpath: string;
	export const npm_config_user_agent: string;
	export const MANAGERPIDFDID: string;
	export const VSCODE_HANDLES_UNCAUGHT_ERRORS: string;
	export const XDG_SESSION_ID: string;
	export const XDG_VTNR: string;
	export const VSCODE_CWD: string;
	export const GIT_EDITOR: string;
	export const SHLVL: string;
	export const npm_lifecycle_event: string;
	export const PAM_KWALLET5_LOGIN: string;
	export const GBM_BACKEND: string;
	export const XDG_DATA_DIRS: string;
	export const KDE_SESSION_VERSION: string;
	export const QT_WAYLAND_RECONNECT: string;
	export const VSCODE_CODE_CACHE_PATH: string;
	export const LOGNAME: string;
	export const SYSTEMD_EXEC_PID: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const PWD: string;
	export const VSCODE_ESM_ENTRYPOINT: string;
	export const OLDPWD: string;
	export const GTK_RC_FILES: string;
	export const NVCC_CCBIN: string;
	export const CLAUDE_CODE_ENABLE_TASKS: string;
	export const CLAUDE_CODE_CHILD_SESSION: string;
	export const CLAUDE_CODE_SESSION_ID: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const XDG_SESSION_TYPE: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const npm_package_json: string;
	export const VSCODE_CRASH_REPORTER_PROCESS_TYPE: string;
	export const ELECTRON_RUN_AS_NODE: string;
	export const XDG_SESSION_PATH: string;
	export const KDE_FULL_SESSION: string;
	export const DESKTOP_SESSION: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const AI_AGENT: string;
	export const SESSION_MANAGER: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const VSSCRIPT_PATH: string;
	export const XDG_CONFIG_DIRS: string;
	export const VSCODE_PID: string;
	export const INVOCATION_ID: string;
	export const CUDA_PATH: string;
	export const NO_AT_BRIDGE: string;
	export const SHELL: string;
	export const COREPACK_ROOT: string;
	export const COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
	export const XDG_SESSION_CLASS: string;
	export const XKB_DEFAULT_MODEL: string;
	export const CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: string;
	export const XDG_SESSION_DESKTOP: string;
	export const GTK2_RC_FILES: string;
	export const VSCODE_CLI: string;
	export const BERRY_BIN_FOLDER: string;
	export const XAUTHORITY: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const CLAUDECODE: string;
	export const XDG_SEAT: string;
	export const npm_package_version: string;
	export const MOTD_SHOWN: string;
	export const HOME: string;
	export const CLAUDE_AGENT_SDK_VERSION: string;
	export const XDG_SEAT_PATH: string;
	export const LANG: string;
	export const CLAUDE_EFFORT: string;
	export const _JAVA_AWT_WM_NONREPARENTING: string;
	export const VSCODE_NLS_CONFIG: string;
	export const PATH: string;
	export const ICEAUTHORITY: string;
	export const KDE_SESSION_UID: string;
	export const _: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const DISPLAY: string;
	export const VSCODE_IPC_HOOK: string;
	export const WAYLAND_DISPLAY: string;
	export const VSCODE_L10N_BUNDLE_LOCATION: string;
	export const MANAGERPID: string;
	export const DEBUGINFOD_URLS: string;
	export const INIT_CWD: string;
	export const CHROME_DESKTOP: string;
	export const XDG_MENU_PREFIX: string;
	export const XKB_DEFAULT_LAYOUT: string;
	export const npm_package_name: string;
	export const PROJECT_CWD: string;
	export const USER: string;
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
		npm_node_execpath: string;
		XKB_DEFAULT_OPTIONS: string;
		MAIL: string;
		KDE_APPLICATIONS_AS_SCOPE: string;
		__GLX_VENDOR_LIBRARY_NAME: string;
		CLAUDE_CODE_EXECPATH: string;
		GDK_BACKEND: string;
		JOURNAL_STREAM: string;
		ELECTRON_NO_ATTACH_CONSOLE: string;
		MCP_CONNECTION_NONBLOCKING: string;
		XDG_RUNTIME_DIR: string;
		FC_FONTATIONS: string;
		npm_execpath: string;
		npm_config_user_agent: string;
		MANAGERPIDFDID: string;
		VSCODE_HANDLES_UNCAUGHT_ERRORS: string;
		XDG_SESSION_ID: string;
		XDG_VTNR: string;
		VSCODE_CWD: string;
		GIT_EDITOR: string;
		SHLVL: string;
		npm_lifecycle_event: string;
		PAM_KWALLET5_LOGIN: string;
		GBM_BACKEND: string;
		XDG_DATA_DIRS: string;
		KDE_SESSION_VERSION: string;
		QT_WAYLAND_RECONNECT: string;
		VSCODE_CODE_CACHE_PATH: string;
		LOGNAME: string;
		SYSTEMD_EXEC_PID: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		PWD: string;
		VSCODE_ESM_ENTRYPOINT: string;
		OLDPWD: string;
		GTK_RC_FILES: string;
		NVCC_CCBIN: string;
		CLAUDE_CODE_ENABLE_TASKS: string;
		CLAUDE_CODE_CHILD_SESSION: string;
		CLAUDE_CODE_SESSION_ID: string;
		MEMORY_PRESSURE_WATCH: string;
		XDG_SESSION_TYPE: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		npm_package_json: string;
		VSCODE_CRASH_REPORTER_PROCESS_TYPE: string;
		ELECTRON_RUN_AS_NODE: string;
		XDG_SESSION_PATH: string;
		KDE_FULL_SESSION: string;
		DESKTOP_SESSION: string;
		MEMORY_PRESSURE_WRITE: string;
		AI_AGENT: string;
		SESSION_MANAGER: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		VSSCRIPT_PATH: string;
		XDG_CONFIG_DIRS: string;
		VSCODE_PID: string;
		INVOCATION_ID: string;
		CUDA_PATH: string;
		NO_AT_BRIDGE: string;
		SHELL: string;
		COREPACK_ROOT: string;
		COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
		XDG_SESSION_CLASS: string;
		XKB_DEFAULT_MODEL: string;
		CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: string;
		XDG_SESSION_DESKTOP: string;
		GTK2_RC_FILES: string;
		VSCODE_CLI: string;
		BERRY_BIN_FOLDER: string;
		XAUTHORITY: string;
		NoDefaultCurrentDirectoryInExePath: string;
		CLAUDECODE: string;
		XDG_SEAT: string;
		npm_package_version: string;
		MOTD_SHOWN: string;
		HOME: string;
		CLAUDE_AGENT_SDK_VERSION: string;
		XDG_SEAT_PATH: string;
		LANG: string;
		CLAUDE_EFFORT: string;
		_JAVA_AWT_WM_NONREPARENTING: string;
		VSCODE_NLS_CONFIG: string;
		PATH: string;
		ICEAUTHORITY: string;
		KDE_SESSION_UID: string;
		_: string;
		XDG_CURRENT_DESKTOP: string;
		DISPLAY: string;
		VSCODE_IPC_HOOK: string;
		WAYLAND_DISPLAY: string;
		VSCODE_L10N_BUNDLE_LOCATION: string;
		MANAGERPID: string;
		DEBUGINFOD_URLS: string;
		INIT_CWD: string;
		CHROME_DESKTOP: string;
		XDG_MENU_PREFIX: string;
		XKB_DEFAULT_LAYOUT: string;
		npm_package_name: string;
		PROJECT_CWD: string;
		USER: string;
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
