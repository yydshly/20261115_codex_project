(() => {
  'use strict';
  const data = window.botResearch;
  if (!data) return;
  const role = new Map(data.trading_roles.map(item => [item.id, item]));
  const research = new Map(data.research_roles.map(item => [item.id, item]));
  const source = new Map(data.sources.map(item => [item.id, item]));
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const understanding = document.querySelector('[data-understanding]');
  for (const item of data.understanding || []) {
    const row = element('li');
    row.append(element('h3', item.title), element('p', item.detail));
    understanding.append(row);
  }

  const hotspots = document.querySelector('[data-conversion-hotspots]');
  const conversionDetail = document.querySelector('[data-conversion-detail]');
  function chooseConversion(index) {
    const item = data.conversions[index];
    hotspots.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    conversionDetail.replaceChildren();
    const title = element('h3', item.from.map(id => role.get(id).code).join(' / ') + ' → ' + research.get(item.to).name);
    const list = element('dl');
    for (const [label, value] of [['方式', item.type], ['保留', item.keep], ['改变', item.change], ['交付', item.deliverable]]) list.append(element('dt', label), element('dd', value));
    conversionDetail.append(title, list);
  }
  data.conversions.forEach((item, index) => {
    const button = element('button');
    const name = item.from.map(id => role.get(id).code).join(' / ') + ' → ' + research.get(item.to).name;
    button.type = 'button';
    button.setAttribute('aria-label', name + '，' + item.type);
    button.style.top = ((3205 + index * 195 - 2960) / 1320 * 100) + '%';
    button.style.height = (175 / 1320 * 100) + '%';
    button.append(element('span', name));
    button.addEventListener('click', () => chooseConversion(index));
    hotspots.append(button);
  });
  chooseConversion(0);

  const tables = document.querySelector('[data-role-tables]');
  for (const [title, roles, original] of [['原帖的 8 个交易岗位（作者描述）', data.trading_roles, true], ['迁移设计的 5 个研究岗位（未部署）', data.research_roles, false]]) {
    tables.append(element('h3', title));
    const wrapper = element('div', undefined, 'role-table-wrap');
    const table = element('table', undefined, 'role-table');
    const head = element('thead'), row = element('tr');
    ['岗位', '输入', '所需工具', '交付', '预期价值 / 边界'].forEach(text => row.append(element('th', text)));
    head.append(row);
    const body = element('tbody');
    for (const r of roles) {
      const tr = element('tr');
      [original ? r.code + ' · ' + r.name : r.name, r.input, r.tools, r.output, r.value + '；' + r.limit].forEach(value => tr.append(element('td', value)));
      body.append(tr);
    }
    table.append(head, body); wrapper.append(table); tables.append(wrapper);
  }

  const discussion = document.querySelector('[data-discussion]');
  data.discussion.forEach((item, index) => {
    const details = element('details');
    if (index === 0) details.open = true;
    details.append(element('summary', String(index + 1).padStart(2, '0') + ' · ' + item.question), element('p', item.answer));
    const references = element('div', undefined, 'source-refs');
    item.source_ids.forEach(id => {
      const a = element('a', '[' + id + '] ' + source.get(id).type);
      a.href = '#source-' + id;
      references.append(a);
    });
    details.append(references); discussion.append(details);
  });
  const boundaryList = document.querySelector('[data-boundaries]');
  data.boundaries.forEach(text => boundaryList.append(element('li', text)));
  const sources = document.querySelector('[data-sources]');
  data.sources.forEach(item => {
    const li = element('li'); li.id = 'source-' + item.id;
    const a = element('a', '[' + item.id + '] ' + item.title, 'source-title');
    a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    li.append(a, element('div', item.type + ' · 读取记录 ' + item.read_on, 'source-meta'), element('p', item.supports), element('p', item.access));
    sources.append(li);
  });

  const viewer = document.querySelector('.image-viewer');
  const image = viewer.querySelector('[data-viewer-image]');
  const title = viewer.querySelector('#viewer-title');
  const range = viewer.querySelector('[data-zoom]');
  const value = viewer.querySelector('[data-zoom-value]');
  const scroll = viewer.querySelector('.viewer-scroll');
  const download = viewer.querySelector('[data-viewer-download]');
  let lastTrigger = null;
  function setZoom(percent) {
    const zoom = Math.max(10, Math.min(150, Math.round(percent)));
    range.value = String(zoom); value.value = zoom + '%'; value.textContent = zoom + '%';
    if (image.naturalWidth) image.style.width = Math.round(image.naturalWidth * zoom / 100) + 'px';
  }
  function fit() { if (image.naturalWidth) setZoom((scroll.clientWidth - 8) / image.naturalWidth * 100); }
  document.querySelectorAll('[data-viewer]').forEach(trigger => trigger.addEventListener('click', event => {
    if (!viewer.showModal) return;
    event.preventDefault(); lastTrigger = trigger;
    title.textContent = trigger.dataset.caption || '研究信息图';
    image.alt = title.textContent; image.onload = fit;
    image.src = trigger.href; download.href = trigger.href;
    viewer.showModal();
    if (image.complete) fit();
    scroll.scrollTo(0, 0);
  }));
  viewer.querySelector('[data-close-viewer]').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-fit]').addEventListener('click', fit);
  viewer.querySelector('[data-actual]').addEventListener('click', () => setZoom(100));
  range.addEventListener('input', () => setZoom(Number(range.value)));
  viewer.addEventListener('close', () => { if (lastTrigger) lastTrigger.focus(); });
  viewer.addEventListener('click', event => { if (event.target === viewer) { const b = viewer.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) viewer.close(); } });
})();
