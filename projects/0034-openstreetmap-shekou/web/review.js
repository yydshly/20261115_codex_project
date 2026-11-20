const dialog = document.querySelector('#zoom');
const zoomImage = document.querySelector('#zoom-image');
const zoomTitle = document.querySelector('#zoom-title');

for (const shot of document.querySelectorAll('[data-zoom]')) {
  shot.addEventListener('click', () => {
    const image = shot.querySelector('img');
    zoomImage.src = image.currentSrc || image.src;
    zoomImage.alt = image.alt;
    zoomTitle.textContent = shot.dataset.zoom;
    dialog.showModal();
  });
}

const lookup = document.querySelector('#lookup');
const search = document.querySelector('#find');
const hits = document.querySelector('#hits');
const groups = Array.from(document.querySelectorAll('#archive details.archive'), (section) => ({
  section,
  openByDefault: section.open,
  rows: Array.from(section.querySelectorAll('li'))
}));
let filtering = false;

lookup.hidden = false;
search.addEventListener('input', () => {
  const words = search.value.trim().toLocaleLowerCase('zh-CN').split(/\s+/u).filter(Boolean);
  const active = words.length > 0;
  let count = 0;

  for (const group of groups) {
    if (active && !filtering) group.openByDefault = group.section.open;
    let visible = 0;
    for (const row of group.rows) {
      const label = row.textContent + ' ' + row.querySelector('a').getAttribute('href');
      row.hidden = active && !words.every((word) => label.toLocaleLowerCase('zh-CN').includes(word));
      if (!row.hidden) visible++;
    }
    count += visible;
    group.section.hidden = active && visible === 0;
    if (active || filtering) group.section.open = active ? visible > 0 : group.openByDefault;
  }

  filtering = active;
  hits.value = active ? (count ? `找到 ${count} 项` : '无匹配产物') : '';
});
