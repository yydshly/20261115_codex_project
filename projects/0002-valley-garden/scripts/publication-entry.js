// Publication-only lossless transport. Original scene sources and assets are unchanged.
const base = new URL('.', import.meta.url);
const fetchOriginal = window.fetch.bind(window);
const response = await fetchOriginal(new URL('compressed-assets.json', base));
if (!response.ok) throw new Error('场景资源索引载入失败');
const mappings = await response.json();
const compressed = new Map(Object.entries(mappings).map(([name, item]) => [new URL(name, base).href, item]));
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input, document.baseURI);
  const item = compressed.get(url.href);
  if (!item) return fetchOriginal(input, init);
  if (typeof DecompressionStream !== 'function') throw new Error('请使用支持解压缩的现代浏览器');
  const request = input instanceof Request ? new Request(new URL(item.path, base), input) : new URL(item.path, base);
  const packed = await fetchOriginal(request, init);
  if (!packed.ok || !packed.body) throw new Error('场景资源载入失败：' + url.pathname);
  const headers = new Headers(packed.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  headers.set('content-type', item.type);
  return new Response(packed.body.pipeThrough(new DecompressionStream('gzip')), {status: packed.status, statusText: packed.statusText, headers});
};
try {
  await import('./main.js');
} catch (error) {
  console.error(error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.style.cssText = 'position:fixed;inset:20px auto auto 20px;z-index:999;background:#f4f3eb;color:#294333;padding:20px;max-width:80vw';
  message.textContent = '场景未能载入，请刷新重试或使用较新的浏览器。';
  document.body.append(message);
}
