(() => {
  "use strict";
  const data = window.SHANHE_ARCHIVE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const storage = {
    get(k, fallback = null) { try { return localStorage.getItem("shanhe:" + k) ?? fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem("shanhe:" + k, v); return true; } catch { return false; } }
  };
  let toastTimer;
  function toast(message) {
    const box = $(".toast"); box.textContent = message; box.classList.add("visible");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove("visible"), 2600);
  }
  function closeNav() {
    document.body.classList.remove("nav-open");
    $(".menu-toggle")?.setAttribute("aria-expanded", "false");
    $(".nav-backdrop").hidden = true;
  }
  $(".menu-toggle")?.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    $(".menu-toggle").setAttribute("aria-expanded", String(open));
    $(".nav-backdrop").hidden = !open;
  });
  $(".nav-backdrop")?.addEventListener("click", closeNav);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeNav(); });

  const lightbox = $("#lightbox");
  let imageIndex = 0;
  function showImage(id) {
    const index = data.assets.findIndex(a => a.id === id);
    if (index < 0) return;
    imageIndex = index;
    const a = data.assets[index];
    const path = "../assets/" + a.file;
    $("#lightbox-img").src = path;
    $("#lightbox-img").alt = a.title + "；" + a.role;
    $("#lightbox-title").textContent = a.title + " · " + a.status;
    $("#lightbox-note").textContent = a.note;
    $("#lightbox-download").href = path;
    $("#lightbox-download").download = a.file;
    if (!lightbox.open) lightbox.showModal();
  }
  $$("[data-lightbox]").forEach(button => button.addEventListener("click", () => showImage(button.dataset.lightbox)));
  $$("[data-close]").forEach(button => button.addEventListener("click", () => $("#" + button.dataset.close).close()));
  lightbox.addEventListener("click", ev => { if (ev.target === lightbox) lightbox.close(); });
  lightbox.addEventListener("keydown", ev => {
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
      ev.preventDefault();
      const delta = ev.key === "ArrowRight" ? 1 : -1;
      showImage(data.assets[(imageIndex + delta + data.assets.length) % data.assets.length].id);
    }
  });

  const searchDialog = $("#search-dialog"), search = $("#archive-search");
  function openSearch() { if (!searchDialog.open) searchDialog.showModal(); search.focus(); }
  $(".search-trigger").addEventListener("click", openSearch);
  document.addEventListener("keydown", ev => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); openSearch(); }
  });
  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase();
    const target = $("#search-results"); target.replaceChildren();
    if (!query) { $("#search-count").textContent = "输入关键词，查找讨论和正文。"; return; }
    const terms = query.split(/\s+/).filter(Boolean);
    const found = data.search.map(doc => {
      const title = doc.title.toLocaleLowerCase(), text = doc.text.toLocaleLowerCase();
      return { ...doc, score: terms.reduce((n, term) => n + (title.includes(term) ? 6 : text.includes(term) ? 1 : 0), 0) };
    }).filter(doc => doc.score > 0).sort((a,b) => b.score - a.score);
    $("#search-count").textContent = found.length ? "找到 " + found.length + " 条相关记录，显示前 24 条。" : "没有找到相关记录，可尝试人物、材料或机制的其他称呼。";
    found.slice(0,24).forEach(doc => {
      const anchor = document.createElement("a"); anchor.className = "search-result"; anchor.href = doc.url;
      const title = document.createElement("strong"); title.textContent = doc.title;
      const excerpt = document.createElement("p");
      const position = doc.text.toLocaleLowerCase().indexOf(terms[0]);
      const start = Math.max(0, position - 30);
      excerpt.textContent = (start ? "…" : "") + doc.text.slice(start, start + 135) + (doc.text.length > start + 135 ? "…" : "");
      anchor.append(title, excerpt);
      anchor.addEventListener("click", () => searchDialog.close());
      target.append(anchor);
    });
  });

  const range = $("#compare-range");
  function comparison() { $("#comparison-view").style.setProperty("--split", range.value + "%"); $("#compare-value").textContent = range.value + "%"; }
  range?.addEventListener("input", comparison);
  if (range) comparison();
  $$("[data-filter]").forEach(button => button.addEventListener("click", () => {
    $$("[data-filter]").forEach(b => { b.classList.toggle("selected", b === button); b.setAttribute("aria-pressed", String(b === button)); });
    let visible = 0;
    $$("[data-asset-state]").forEach(entry => {
      const keep = button.dataset.filter === "all" || entry.dataset.assetState === button.dataset.filter;
      entry.hidden = !keep; if (keep) visible++;
    });
    $("#filter-count").textContent = "当前显示 " + visible + " 份视觉记录";
  }));
  $$("[data-district]").forEach(button => button.addEventListener("click", () => {
    $$("[data-district]").forEach(b => { const active = b === button; b.classList.toggle("selected", active); b.setAttribute("aria-pressed", String(active)); });
    $$(".district-panel").forEach(panel => panel.hidden = panel.id !== "district-" + button.dataset.district);
  }));

  if (document.body.dataset.page === "story") {
    const sizes = { min:16, max:24 };
    let size = Number(storage.get("font-size", "18"));
    if (!Number.isFinite(size)) size = 18;
    function setFont(value) {
      size = Math.max(sizes.min, Math.min(sizes.max, value));
      document.documentElement.style.setProperty("--story-font", size + "px");
      $("#font-size").textContent = size;
      storage.set("font-size", String(size));
      $("#font-smaller").disabled = size === sizes.min;
      $("#font-larger").disabled = size === sizes.max;
    }
    setFont(size);
    $("#font-smaller").addEventListener("click", () => setFont(size - 1));
    $("#font-larger").addEventListener("click", () => setFont(size + 1));
    $("#focus-reading").addEventListener("click", () => {
      const focus = document.body.classList.toggle("reading-mode");
      $("#focus-reading").setAttribute("aria-pressed", String(focus));
      $("#focus-reading").textContent = focus ? "退出专注" : "专注阅读";
    });
    const saved = storage.get("reading-section");
    if (saved && document.getElementById(saved)) {
      $("#resume-reading").hidden = false;
      $("#resume-reading").addEventListener("click", () => document.getElementById(saved).scrollIntoView({ block:"start" }));
    }
    const sections = $$("[data-story-section]");
    let readingFrame = false;
    function trackReading() {
      readingFrame = false;
      const line = Math.min(innerHeight * 0.3, 220);
      let current = sections[0];
      if (!current || current.getBoundingClientRect().top > innerHeight * 0.75) return;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section;
        else break;
      }
      const id = current.id;
      storage.set("reading-section", id);
      $$(".story-toc a").forEach(a => a.classList.toggle("current", a.hash === "#" + id));
    }
    function queueReading() {
      if (!readingFrame) { readingFrame = true; requestAnimationFrame(trackReading); }
    }
    addEventListener("scroll", queueReading, { passive:true });
    addEventListener("resize", queueReading);
    if (location.hash) queueReading();
  }

  function computeVote(values) {
    const ditch = values.filter(v => v === "ditch").length;
    const platform = values.filter(v => v === "platform").length;
    const abstain = values.length - ditch - platform;
    const tied = ditch === platform;
    return { ditch, platform, abstain, tied, result:ditch > platform ? "ditch" : "platform" };
  }
  function renderVote() {
    const fields = $$("[data-vote]"); if (!fields.length) return;
    const values = fields.map(select => select.value), vote = computeVote(values);
    const resultName = vote.result === "ditch" ? "临时排水沟" : "高架货台";
    $("#vote-result-title").textContent = resultName;
    $("#vote-tally").textContent = "排水沟 " + vote.ditch + " 票 · 货台 " + vote.platform + " 票 · 弃权 " + vote.abstain + " 人";
    $("#vote-explanation").textContent = vote.ditch + vote.platform === 0
      ? "本次无人投票，执行事先公开的默认货台方案。不能把它记录为全体赞同。"
      : vote.tied
      ? "出现平票，按本章提前公布的规则采用高架货台。队长没有额外票；个人立场不被覆盖。"
      : "按已投票者的多数采用本次施工方案。结果只用于这个小队现场，不替所有居民改写世界。";
    const people = $("#personal-positions"); people.replaceChildren();
    values.forEach((value, i) => {
      const p = document.createElement("p");
      const stance = value === "ditch" ? "支持排水沟" : value === "platform" ? "支持货台" : "未表态";
      p.textContent = "玩家 " + (i+1) + "：" + stance + "；共同施工为" + resultName + "。个人记录仍保留原立场。";
      people.append(p);
    });
  }
  $$("[data-vote]").forEach(select => select.addEventListener("change", renderVote));
  $("#reset-votes")?.addEventListener("click", () => { $$("[data-vote]").forEach((s,i) => s.value = i < 2 ? "ditch" : "platform"); renderVote(); });
  renderVote();
  function progress() {
    const fields = $$("[data-progress]"); if (!fields.length) return;
    const done = fields.filter(x => x.checked).length;
    $("#progress-title").textContent = done === 4 ? "可以进入第二章" : "还需要共同完成 " + (4-done) + " 件事";
    $("#progress-note").textContent = done === 4
      ? "收到上游商议水道的邀请。无论公共建筑是否完工，章节出口都已经成立。"
      : "目前完成 " + done + " / 4。公共建筑状态只改变服务与外观，不计入这四项。";
    $("#progress-title").dataset.unlocked = String(done === 4);
  }
  $$("[data-progress],#public-complete").forEach(field => field.addEventListener("change", progress));
  progress();
  $$("[data-question]").forEach(field => {
    field.checked = storage.get("question-" + field.dataset.question) === "1";
    field.addEventListener("change", () => storage.set("question-" + field.dataset.question, field.checked ? "1" : "0"));
  });
  const notes = $("#local-notes");
  if (notes) {
    notes.value = storage.get("notes", "");
    notes.addEventListener("input", () => {
      const ok = storage.set("notes", notes.value);
      $("#notes-status").textContent = ok ? "已暂存本机浏览器；不会同步或修改资料" : "浏览器不允许本地保存，请导出手记";
    });
    $("#export-notes").addEventListener("click", () => {
      const record = { project:"0019-shanhe-co-creation", type:"个人阅读手记，非项目定稿", notes:notes.value, marked_questions:$$("[data-question]").map(field => ({ text:field.nextElementSibling.textContent, marked:field.checked })) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(record,null,2)], { type:"application/json;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = "shanhe-reading-notes.json"; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url),1000); toast("手记已导出；项目结论未改变");
    });
  }
  window.shanheArchiveDemo = Object.freeze({ computeVote });
})();
