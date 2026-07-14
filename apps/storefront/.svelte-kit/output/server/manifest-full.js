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
		client: {start:"_app/immutable/entry/start.BRP0BT3f.js",app:"_app/immutable/entry/app.BBRJJu0f.js",imports:["_app/immutable/entry/start.BRP0BT3f.js","_app/immutable/chunks/BzoBoVc-.js","_app/immutable/chunks/D1euCxZ-.js","_app/immutable/chunks/DlwYb_-q.js","_app/immutable/entry/app.BBRJJu0f.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/DlwYb_-q.js","_app/immutable/chunks/D1euCxZ-.js","_app/immutable/chunks/CA5q2WfI.js","_app/immutable/chunks/BdsQxGa_.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
		],
		remotes: {
			'v8uztx': __memo(() => import('./chunks/remote-v8uztx.js')),
			'1gtf39y': __memo(() => import('./chunks/remote-1gtf39y.js')),
			'1mvazxm': __memo(() => import('./chunks/remote-1mvazxm.js')),
			'101ujqe': __memo(() => import('./chunks/remote-101ujqe.js'))
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/account",
				pattern: /^\/account\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/cart",
				pattern: /^\/cart\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
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
