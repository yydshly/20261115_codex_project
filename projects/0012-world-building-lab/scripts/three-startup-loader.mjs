export async function resolve(specifier,context,nextResolve){return nextResolve(specifier==='three'?new URL('./three-startup-adapter.mjs',import.meta.url).href:specifier,context);}
