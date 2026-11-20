// Resolve the project's already built, pinned runtime for CPU geometry checks only.
export async function resolve(specifier,context,nextResolve){return nextResolve(specifier==='three'?new URL('../web/runtime/three.module.js',import.meta.url).href:specifier,context);}
