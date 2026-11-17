(() => {
  'use strict';
  const dataNode = document.querySelector('#research-data');
  const research = dataNode ? JSON.parse(dataNode.textContent) : null;
  const allVideos = [...document.querySelectorAll('video')];
  let mode = 'v2';
  let toastTimer;
  function toast(message) {
    const box = document.querySelector('.toast');
    if (!box) return;
    clearTimeout(toastTimer);
    box.textContent = message;
    box.classList.add('is-visible');
    toastTimer = setTimeout(() => box.classList.remove('is-visible'), 3200);
  }
  function timeLabel(time) {
    const whole = Math.floor(time);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  }
  function wireTabs(container, activate) {
    if (!container) return;
    const tabs = [...container.querySelectorAll('[role=tab]')];
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus({ preventScroll: true });
        tabs[next].click();
      });
    });
  }
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  function closeMenu() {
    document.body.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', '打开导航');
  }
  menu?.addEventListener('click', () => {
    const opened = document.body.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(opened));
    menu.setAttribute('aria-label', opened ? '关闭导航' : '打开导航');
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (innerWidth > 880) closeMenu(); });
  if (research && document.querySelector('#screen-panel')) {
    const screens = [...document.querySelectorAll('.film-screen')];
    const chapters = [...document.querySelectorAll('.chapter')];
    const workspace = document.querySelector('#screen-panel');
    const compare = document.querySelector('.compare-note');
    const notes = document.querySelector('#film-notes');
    const films = { v1: document.querySelector('#video-v1'), v2: document.querySelector('#video-v2') };
    const bothButton = document.querySelector('#play-both');
    function updateCompareButton() {
      const playing = Object.values(films).some(video => !video.paused && !video.ended);
      bothButton.textContent = playing ? '暂停两版播放 Ⅱ' : '两版从开头一起播放 ▷';
    }
    function setMode(next) {
      if (!['v1', 'v2', 'compare'].includes(next)) return;
      Object.values(films).forEach(video => video.pause());
      mode = next;
      workspace.classList.toggle('is-compare', next === 'compare');
      workspace.setAttribute('aria-labelledby', `tab-${next}`);
      screens.forEach(screen => { screen.hidden = next !== 'compare' && screen.dataset.film !== next; });
      notes.hidden = next === 'compare';
      compare.hidden = next !== 'compare';
      document.querySelectorAll('.version-tabs [role=tab]').forEach(tab => {
        const active = tab.dataset.mode === next;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      if (next !== 'compare') {
        const version = research.versions.find(item => item.id === next);
        document.querySelector('#film-kicker').textContent = version.label;
        document.querySelector('#film-title').textContent = version.title;
        document.querySelector('#film-summary').textContent = version.summary;
        document.querySelector('#film-status').textContent = version.status;
        chapters.forEach((button, i) => { button.querySelector('time').textContent = timeLabel(version.starts[i]); });
        updateChapter();
      }
      updateCompareButton();
    }
    function updateChapter() {
      if (mode === 'compare') return;
      const version = research.versions.find(item => item.id === mode);
      const current = films[mode].currentTime;
      let index = version.starts.findLastIndex ? version.starts.findLastIndex(start => start <= current + .03) : version.starts.reduce((acc, start, i) => start <= current + .03 ? i : acc, 0);
      chapters.forEach((button, i) => {
        button.classList.toggle('is-active', i === index);
        button.setAttribute('aria-pressed', String(i === index));
      });
    }
    function seekChapter(versionId, chapterIndex, scroll) {
      if (mode !== versionId) setMode(versionId);
      const video = films[versionId];
      const version = research.versions.find(item => item.id === versionId);
      const seek = () => { video.currentTime = Math.min(version.starts[chapterIndex], Math.max(0, video.duration - .1)); updateChapter(); };
      if (video.readyState >= 1) seek();
      else video.addEventListener('loadedmetadata', seek, { once: true });
      video.play().catch(() => toast('已定位这一段，可按播放键观看。'));
      if (scroll) document.querySelector('#watch').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      else if (matchMedia('(max-width: 640px)').matches) video.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
    wireTabs(document.querySelector('.version-tabs'), tab => setMode(tab.dataset.mode));
    chapters.forEach((button, index) => button.addEventListener('click', () => seekChapter(mode, index, false)));
    document.querySelectorAll('[data-rhythm-version]').forEach(button => button.addEventListener('click', () => seekChapter(button.dataset.rhythmVersion, Number(button.dataset.chapter), true)));
    Object.values(films).forEach(video => {
      video.addEventListener('timeupdate', updateChapter);
      ['play', 'pause', 'ended'].forEach(event => video.addEventListener(event, updateCompareButton));
    });
    bothButton.addEventListener('click', async () => {
      if (Object.values(films).some(video => !video.paused && !video.ended)) {
        Object.values(films).forEach(video => video.pause());
      } else {
        Object.values(films).forEach(video => { video.currentTime = 0; });
        const outcomes = await Promise.allSettled(Object.values(films).map(video => video.play()));
        if (outcomes.some(result => result.status === 'rejected')) toast('部分视频未能自动起播，请使用各自的播放键。');
      }
      updateCompareButton();
    });
    setMode('v2');
  }
  allVideos.forEach(video => {
    video.addEventListener('play', () => {
      if (mode !== 'compare' || document.body.dataset.page === 'archive') allVideos.forEach(other => { if (other !== video) other.pause(); });
    });
    video.addEventListener('error', () => toast('视频暂时无法载入，可以使用对应下载链接打开。'));
  });
  if (research && document.querySelector('#theme-panel')) {
    function selectTheme(tab) {
      const theme = research.themes.find(item => item.id === tab.dataset.theme);
      if (!theme) return;
      document.querySelectorAll('.theme-tabs [role=tab]').forEach(button => {
        const active = button === tab;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      document.querySelector('#theme-panel').setAttribute('aria-labelledby', tab.id);
      document.querySelector('#theme-state').textContent = theme.state;
      document.querySelector('#theme-title').textContent = theme.word;
      const dl = document.querySelector('#theme-details');
      dl.replaceChildren();
      [['人物入口', theme.entry], ['可感变化', theme.changes], ['场景展开', theme.world]].forEach(([label, text]) => {
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = text;
        dl.append(dt, dd);
      });
      document.querySelector('#theme-check').textContent = '验收时问自己：' + theme.check;
    }
    wireTabs(document.querySelector('.theme-tabs'), selectTheme);
    selectTheme(document.querySelector('#theme-spring'));
  }
  const imageDialog = document.querySelector('#image-dialog');
  let imageTrigger;
  document.querySelectorAll('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
    imageTrigger = button;
    const caption = button.dataset.caption || button.querySelector('img')?.alt || '实际画面';
    imageDialog.querySelector('img').src = button.dataset.lightbox;
    imageDialog.querySelector('img').alt = caption;
    imageDialog.querySelector('p').textContent = caption;
    imageDialog.showModal();
  }));
  imageDialog?.querySelector('.dialog-close').addEventListener('click', () => imageDialog.close());
  imageDialog?.addEventListener('click', event => { if (event.target === imageDialog) imageDialog.close(); });
  imageDialog?.addEventListener('close', () => imageTrigger?.focus({ preventScroll: true }));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copy)?.textContent;
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement('textarea');
        area.value = text; area.style.position = 'fixed'; area.style.top = '-1000px';
        document.body.append(area); area.select();
        const copied = document.execCommand('copy'); area.remove();
        if (!copied) throw new Error('copy unavailable');
      }
      toast('实际提示词已复制。');
      button.textContent = '已复制';
      setTimeout(() => { button.textContent = '复制提示词'; }, 2200);
    } catch {
      toast('浏览器暂不允许复制，可下载文本或选择正文复制。');
    }
  }));
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('#main-nav a[href^="#"]')];
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach(entry => {
        links.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-20% 0px -65% 0px' });
    links.forEach(link => { const target = document.querySelector(link.hash); if (target) observer.observe(target); });
  }
})();
