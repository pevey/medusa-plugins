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
		client: {start:"_app/immutable/entry/start.J_Rj9mpL.js",app:"_app/immutable/entry/app.BnJM-anF.js",imports:["_app/immutable/entry/start.J_Rj9mpL.js","_app/immutable/chunks/DdddQVhg.js","_app/immutable/chunks/DFywPtyc.js","_app/immutable/chunks/DzoT2XKU.js","_app/immutable/entry/app.BnJM-anF.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/DzoT2XKU.js","_app/immutable/chunks/DFywPtyc.js","_app/immutable/chunks/Bkl6h9bT.js","_app/immutable/chunks/BsW680RG.js","_app/immutable/chunks/qJnmI453.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
		],
		remotes: {
			'1gtf39y': __memo(() => import('./chunks/remote-1gtf39y.js')),
			'v8uztx': __memo(() => import('./chunks/remote-v8uztx.js')),
			'8zz69k': __memo(() => import('./chunks/remote-8zz69k.js')),
			'1mvazxm': __memo(() => import('./chunks/remote-1mvazxm.js')),
			'1hg7f4b': __memo(() => import('./chunks/remote-1hg7f4b.js')),
			'l391ke': __memo(() => import('./chunks/remote-l391ke.js')),
			'1aw3z04': __memo(() => import('./chunks/remote-1aw3z04.js')),
			'1q1ur2r': __memo(() => import('./chunks/remote-1q1ur2r.js')),
			'12v7dmm': __memo(() => import('./chunks/remote-12v7dmm.js')),
			'101ujqe': __memo(() => import('./chunks/remote-101ujqe.js')),
			'1dq7nwq': __memo(() => import('./chunks/remote-1dq7nwq.js')),
			'886o7s': __memo(() => import('./chunks/remote-886o7s.js')),
			'swcotn': __memo(() => import('./chunks/remote-swcotn.js')),
			'145mkkg': __memo(() => import('./chunks/remote-145mkkg.js'))
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
