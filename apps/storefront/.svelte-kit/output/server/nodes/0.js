

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.Dm_OWCDU.js","_app/immutable/chunks/Bkl6h9bT.js","_app/immutable/chunks/DzoT2XKU.js","_app/immutable/chunks/qJnmI453.js"];
export const stylesheets = [];
export const fonts = [];
