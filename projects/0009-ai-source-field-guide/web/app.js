"use strict";
(() => {
  const data = window.sourceGuide;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const esc = (value) => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const externalLink = (title, url, className = "") => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"${className ? ` class="${esc(className)}"` : ""}>${esc(title)} ↗</a>`;

  $("#platform-list").innerHTML = data.platforms.map(platform => `
    <details class="platform-row" id="platform-${esc(platform.id)}" data-platform="${esc(platform.id)}">
      <summary><span class="platform-logo" style="--logo-bg:${esc(platform.color)};--logo-color:${esc(platform.ink)}" aria-hidden="true">${esc(platform.symbol)}</span>
        <span><span class="platform-name"><h3>${esc(platform.name)}</h3>${platform.extra ? '<span class="extra-tag">本次补充</span>' : ''}</span><span class="platform-description">${esc(platform.description)}</span></span>
        <span class="usage-level${platform.core ? " core" : ""}">${esc(platform.level)}</span><span class="expand-sign" aria-hidden="true">＋</span>
      </summary>
      <div class="platform-body"><div><h4>怎样使用</h4><p>${esc(platform.how)}</p></div><div><h4>判断边界</h4><p>${esc(platform.limit)}</p></div>
        <div class="platform-links">${platform.links.map(link => externalLink(...link)).join("")}</div>
      </div>
    </details>`).join("");

  $("#author-list").innerHTML = data.authors.map(author => `
    <article class="author-row"><span class="author-monogram" aria-hidden="true">${esc(author.initials)}</span>
      <div class="author-title"><strong><a href="${esc(author.url)}" target="_blank" rel="noopener noreferrer">${esc(author.name)}</a></strong><span>${esc(author.label)}</span></div>
      <p class="author-copy">${esc(author.focus)}<small>${esc(author.start)}</small></p><span class="author-arrow" aria-hidden="true">↗</span>
    </article>`).join("");

  $("#repo-list").innerHTML = data.repos.map(repo => `
    <article class="repo-item"><span class="repo-kicker">${esc(repo.owner)} / OPEN SOURCE</span><h3>${externalLink(repo.name, repo.url)}</h3>
      <p>${esc(repo.focus)}${esc(repo.watch)}</p><small>${esc(repo.license)} · 这里只作关注入口，未在本项目中运行第三方软件</small>
    </article>`).join("");

  $("#source-list").innerHTML = data.sources.map(source => `<li>${externalLink(source.title, source.url)}<small>${esc(source.note)}</small></li>`).join("");

  let currentFilter = "all";
  const updatePlatforms = () => {
    const query = $("#platform-search").value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const platform of data.platforms) {
      const searchable = [platform.name, platform.description, platform.how, platform.limit, ...platform.links.map(link => link[0])].join(" ").toLocaleLowerCase();
      const match = (currentFilter === "all" || platform.groups.includes(currentFilter)) && (!query || searchable.includes(query));
      $(`#platform-${platform.id}`).hidden = !match;
      if (match) visible += 1;
    }
    $("#platform-result").textContent = `显示 ${visible} / ${data.platforms.length} 个入口 · 点击条目查看使用建议与链接`;
    $("#empty-state").hidden = visible !== 0;
  };
  $$(".filter").forEach(button => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    $$(".filter").forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    updatePlatforms();
  }));
  $("#platform-search").addEventListener("input", updatePlatforms);
  $("#reset-filter").addEventListener("click", () => {
    $("#platform-search").value = "";
    $('[data-filter="all"]').click();
    $("#platform-search").focus();
  });
  updatePlatforms();

  const tabs = $$(".follow-tabs [role=tab]");
  function selectTab(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      const positions = {ArrowRight:(index + 1) % tabs.length,ArrowLeft:(index - 1 + tabs.length) % tabs.length,Home:0,End:tabs.length - 1};
      if (Object.hasOwn(positions, event.key)) {
        event.preventDefault();
        const next = tabs[positions[event.key]];
        selectTab(next);
        next.focus();
      }
    });
  });

  let currentPath = "find";
  const renderPath = () => {
    const path = data.paths[currentPath];
    $("#research-path").innerHTML = `<h3 class="path-title"><span>ILLUSTRATIVE WORKFLOW</span>${esc(path.title)}</h3><div class="path-steps">${path.steps.map((step,index) => `<div class="path-step"><span>STEP 0${index+1}</span><h4>${esc(step.title)}</h4><p>${esc(step.text)}</p></div>`).join("")}</div>`;
  };
  $$(".path-button").forEach(button => button.addEventListener("click", () => {
    currentPath = button.dataset.path;
    $$(".path-button").forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderPath();
  }));
  renderPath();

  const checks = $$('input[name="evidence"]');
  checks.forEach(check => check.addEventListener("change", () => {
    const count = checks.filter(item => item.checked).length;
    $("#check-status").textContent = `已确认 ${count} / ${checks.length} 项 · ${count === checks.length ? "可安排最小验证，结论仍须由结果支撑。" : "继续核对证据与适用条件。"}`;
  }));

  let exportUrl = null;
  $("#export-note").addEventListener("click", () => {
    const question = $("#research-question").value.trim() || "待填写具体研究问题";
    const path = data.paths[currentPath];
    const lines = ["# AI / 开源项目研究记录", "", `研究问题：${question}`, "记录日期：", "", "## 研究路径（建议）", "", path.title, ...path.steps.map((step,index) => `${index+1}. ${step.title}：${step.text}`), "", "## 阅读检查进度", "", ...checks.map(check => `- [${check.checked ? "x" : " "}] ${check.value}`), "", "勾选反映整理进度，不代表内容或项目已被验证。", "", "## 原始来源", "", "- 项目名称与仓库：", "- 作者 / 原文链接：", "- 来源版本或提交：", "- 许可证：", "", "## 声明、判断与验证", "", "- 作者声称的能力：", "- 我的推断及依据：", "- 实际验证的步骤与结果：", "- 运行环境、硬件、依赖版本与数据：", "- 失败案例、成本与适用限制：", "- 未确认项：", "- 下一步决定：", "", "模板来源：知源 · AI 与开源信息源指南（项目 0009，2026-11-16 整理）", ""];
    const content = lines.join("\n");
    $("#note-content").value = content;
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(new Blob([content], {type:"text/markdown;charset=utf-8"}));
    $("#download-note").href = exportUrl;
    $("#note-preview").hidden = false;
    $("#note-status").textContent = "记录已生成；包含当前问题、研究路径和检查进度。";
    $("#note-content").focus({preventScroll:true});
  });

  // Anchor navigation also works without JavaScript; this only adds a location cue.
  if ("IntersectionObserver" in window) {
    const sections = $$("main > section[id]");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        $$(".nav-link").forEach(link => {
          const active = link.hash === `#${entry.target.id}`;
          link.classList.toggle("active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }
    }, {rootMargin:"-12% 0px -66% 0px",threshold:0});
    sections.forEach(section => observer.observe(section));
  }
})();
