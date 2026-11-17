// Optional reading enhancement; all research content is rendered in the HTML.
const jumps = [...document.querySelectorAll('.flow-jump a')];
function markCurrent() {
  for (const jump of jumps) {
    if (jump.hash === location.hash) jump.setAttribute('aria-current', 'true');
    else jump.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', markCurrent);
markCurrent();
