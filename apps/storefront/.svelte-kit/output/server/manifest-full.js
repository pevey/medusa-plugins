export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DrjOOuu3.js",app:"_app/immutable/entry/app.BvmuWHMC.js",imports:["_app/immutable/entry/start.DrjOOuu3.js","_app/immutable/chunks/CbHVfJ7N.js","_app/immutable/chunks/0KMqrmSz.js","_app/immutable/chunks/CSsoRa2M.js","_app/immutable/entry/app.BvmuWHMC.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/0KMqrmSz.js","_app/immutable/chunks/l8Au_C98.js","_app/immutable/chunks/DlFFTTFx.js","_app/immutable/chunks/CSsoRa2M.js","_app/immutable/chunks/pDHBIEnx.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			'1gtf39y': __memo(() => import('./chunks/remote-1gtf39y.js')),
			'v8uztx': __memo(() => import('./chunks/remote-v8uztx.js'))
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
