

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.D1rqNp9g.js","_app/immutable/chunks/CA5q2WfI.js","_app/immutable/chunks/DlwYb_-q.js","_app/immutable/chunks/BdsQxGa_.js"];
export const stylesheets = [];
export const fonts = [];
