"use strict";

(() => {
  const { research, archive } = window.EVERYDAY_WONDERS;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const imagePath = (name) => document.body.dataset.assets + name;
  const stories = archive.stories;
  const byId = new Map(stories.map((story) => [story.id, story]));
  const directionNames = new Map(research.directions.map((direction) => [direction.id, direction.title]));
  const stageName = (story) => story.stage === "treatment" ? "完整方向 · 待细化" : "故事种子 · 待展开";
  let referenceIndex = 0;
  let stageFilter = "all";
  let searchQuery = "";
  let selectedStory = byId.has(new URL(location.href).searchParams.get("story")) ? new URL(location.href).searchParams.get("story") : "EW-006";
  let imageOpener = null;

  function renderReference(index, focusTab = false) {
    referenceIndex = (index + research.observations.length) % research.observations.length;
    const observation = research.observations[referenceIndex];
    $("#reference-tabs").innerHTML = research.observations.map((item, i) => `<button id="tab-${item.id}" role="tab" aria-selected="${i === referenceIndex}" aria-controls="reference-panel" tabindex="${i === referenceIndex ? 0 : -1}" data-index="${i}"><span>${item.number} / ${esc(item.time)}</span><strong>${esc(item.title)}</strong><small>${esc(item.action)}</small></button>`).join("");
    $("#reference-panel").setAttribute("aria-labelledby", `tab-${observation.id}`);
    $("#reference-panel").innerHTML = `<button class="reference-image-button" id="enlarge-reference" aria-label="放大原片引用图：${esc(observation.title)}"><img src="${esc(imagePath(observation.image))}" alt="${esc(observation.fact)}" width="284" height="448"><span class="zoom-hint">查看引用图 ＋</span></button><div class="reference-text"><span class="reference-number">${observation.number}<small> / 05</small></span><h3>${esc(observation.title)}</h3><div class="reading-row"><span>画面事实</span><p>${esc(observation.fact)}</p></div><div class="reading-row"><span>我们的理解</span><p>${esc(observation.reading)}</p></div><div class="reading-row"><span>怎样复用</span><p>${esc(observation.transfer)}</p></div><div class="reference-arrows"><button data-reference-step="-1" aria-label="上一处原片情境">← 上一处</button><button data-reference-step="1" aria-label="下一处原片情境">下一处 →</button></div></div>`;
    if (focusTab) $(`#tab-${observation.id}`).focus();
  }

  $("#reference-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-index]");
    if (tab) renderReference(Number(tab.dataset.index), true);
  });
  $("#reference-tabs").addEventListener("keydown", (event) => {
    const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (offset) { event.preventDefault(); renderReference(referenceIndex + offset, true); }
    if (event.key === "Home" || event.key === "End") { event.preventDefault(); renderReference(event.key === "Home" ? 0 : research.observations.length - 1, true); }
  });
  $("#reference-panel").addEventListener("click", (event) => {
    const stepButton = event.target.closest("[data-reference-step]");
    if (stepButton) { renderReference(referenceIndex + Number(stepButton.dataset.referenceStep)); return; }
    if (event.target.closest("#enlarge-reference")) {
      imageOpener = $("#enlarge-reference");
      const item = research.observations[referenceIndex];
      $("#dialog-image").src = imagePath(item.image);
      $("#dialog-image").alt = item.fact;
      $("#image-title").textContent = `${item.title} · ${item.time}`;
      $("#image-dialog").showModal();
    }
  });
  $("#close-image").addEventListener("click", () => $("#image-dialog").close());
  $("#image-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  $("#image-dialog").addEventListener("close", () => { if (imageOpener?.isConnected) imageOpener.focus(); });

  $("#principles").innerHTML = research.principles.map((item, i) => `<article class="principle"><span class="principle-num">0${i + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><small>对应依据 · ${esc(item.evidence)}</small></article>`).join("");
  $("#value-list").innerHTML = research.values.map((item, i) => `<article class="value-item"><span class="value-num">0${i + 1}</span><h4>${esc(item.title)}</h4><div><p>${esc(item.gain)}</p><small>用在：${esc(item.use)}</small><small>边界：${esc(item.limit)}</small></div></article>`).join("");
  $("#direction-list").innerHTML = research.directions.map((item, i) => `<article class="direction-card"><div class="direction-top"><span>0${i + 1}</span><h3>${esc(item.title)}</h3></div><p>${esc(item.description)}</p><p class="direction-rule">展开时保留：${esc(item.rule)}</p><div class="direction-story-links">${item.stories.map((id) => `<a href="?story=${id}#stories" data-story-link="${id}">${esc(byId.get(id).title)} ↗</a>`).join("")}</div></article>`).join("");
  $("#expansion-list").innerHTML = research.expansions.map((item, i) => `<article><span class="expansion-index">0${i + 1} / POSSIBILITIES</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><small>${esc(item.status)}</small></article>`).join("");

  function matchingStories() {
    return stories.filter((story) => {
      const searchable = [story.id, story.title, story.logline, story.story, directionNames.get(story.direction), story.tone, ...story.assets].join(" ").toLocaleLowerCase();
      return (stageFilter === "all" || story.stage === stageFilter) && (!searchQuery || searchable.includes(searchQuery));
    });
  }

  function renderShelf() {
    const matches = matchingStories();
    $("#story-count").textContent = `显示 ${matches.length} / ${stories.length} 份故事档案`;
    $("#story-list").innerHTML = matches.map((story) => `<button class="story-choice${story.id === selectedStory ? " is-current" : ""}" data-story="${story.id}" aria-pressed="${story.id === selectedStory}" aria-controls="story-reader"><span class="choice-top"><span>${story.id}</span><span class="stage-label">${story.stage === "treatment" ? `完整方向 · 约${story.duration}秒` : "故事种子 · 时长未定"}</span></span><strong>${esc(story.title)}</strong><p>${esc(story.logline)}</p></button>`).join("");
    $("#empty-results").hidden = matches.length !== 0;
    $("#story-reader").hidden = matches.length === 0;
    document.querySelectorAll("[data-stage]").forEach((button) => { const selected = button.dataset.stage === stageFilter; button.classList.toggle("selected", selected); button.setAttribute("aria-pressed", String(selected)); });
    return matches;
  }

  function selectStory(id, options = {}) {
    if (!byId.has(id)) return;
    selectedStory = id;
    const story = byId.get(id);
    if (options.resetFilters) { stageFilter = "all"; searchQuery = ""; $("#story-search").value = ""; }
    renderShelf();
    $("#story-reader").innerHTML = `<div class="story-kicker"><span>STORY FILE / ${story.id}</span><span>${esc(stageName(story))}</span></div><h3>${esc(story.title)}</h3><p class="story-logline">${esc(story.logline)}</p><div class="story-info"><span>${esc(directionNames.get(story.direction))}</span><span>${story.duration ? `目标约${story.duration}秒 · 草案` : "尚未确定制作时长"}</span><span>文字方案 · 未生成</span></div><p class="story-abstract">${esc(story.story)}</p><dl class="story-definition"><dt>人物愿望</dt><dd>${esc(story.wish)}</dd></dl><dl class="story-definition"><dt>奇妙规则</dt><dd>${esc(story.rule)}</dd></dl><dl class="story-definition"><dt>情绪方向</dt><dd>${esc(story.tone)}</dd></dl><div class="story-separator"><h4>${story.stage === "treatment" ? "按场景展开的故事" : "这个种子的起承与回应"}</h4><ol class="sequence">${story.scenes.map((scene) => `<li><span class="sequence-time">${esc(scene.time)}</span><div><h5>${esc(scene.place)}</h5><p>${esc(scene.action)}</p><small>承接 · ${esc(scene.connection)}</small></div></li>`).join("")}</ol></div><div class="story-separator"><h4>为什么留下这个故事</h4><dl class="story-definition"><dt>结尾回应</dt><dd>${esc(story.ending)}</dd></dl><dl class="story-definition"><dt>创作价值</dt><dd>${esc(story.value)}</dd></dl></div><p class="archive-note"><strong>下一步需要补齐</strong><br>${esc(story.gap)}</p><div class="story-dev"><details><summary>继续制作时，先准备什么？</summary><div class="asset-tags">${story.assets.map((asset) => `<span>${esc(asset)}</span>`).join("")}</div><ul>${story.next.map((step) => `<li>${esc(step)}</li>`).join("")}</ul></details><details><summary>最难的一镜与先试什么</summary><p><strong>风险：</strong>${esc(story.risk)}</p><p><strong>最小试制：</strong>${esc(story.test)}</p></details></div>${story.relations.length ? `<div class="story-relations">相关母题 ${story.relations.map((relatedId) => `<a href="?story=${relatedId}#stories" data-story-link="${relatedId}">${esc(byId.get(relatedId).title)} ↗</a>`).join("")}</div>` : ""}<div class="story-export"><button class="button dark" id="export-story">导出这份创作任务书 ↓</button><a href="../stories/${story.id}.md" download>故事全文存档 ↗</a></div><p class="story-history">档案说明 · ${esc(story.history)}<br>本轮补充的场景承接、风险与试制建议，属于整理建议。归档不等于用户已选定实施。</p>`;
    if (!options.initial) {
      const url = new URL(location.href);
      url.searchParams.set("story", id);
      if (options.scroll) url.hash = "stories";
      history.replaceState({ story: id }, "", url);
    }
    if (options.scroll) $("#stories").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    if (options.focus) $("#story-reader").focus({ preventScroll: true });
  }

  $("#story-list").addEventListener("click", (event) => {
    const choice = event.target.closest("[data-story]");
    if (choice) { selectStory(choice.dataset.story, { focus: true }); if (matchMedia("(max-width: 760px)").matches) $("#story-reader").scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-story-link]");
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); selectStory(link.dataset.storyLink, { resetFilters: true, scroll: true, focus: true }); }
  });
  document.querySelectorAll("[data-stage]").forEach((button) => button.addEventListener("click", () => {
    stageFilter = button.dataset.stage;
    const matches = renderShelf();
    if (matches.length && !matches.some((story) => story.id === selectedStory)) selectStory(matches.find((story) => story.stage === "treatment")?.id || matches[0].id);
  }));
  $("#story-search").addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLocaleLowerCase();
    const matches = renderShelf();
    if (matches.length && !matches.some((story) => story.id === selectedStory)) selectStory(matches[0].id);
  });
  $("#reset-search").addEventListener("click", () => { stageFilter = "all"; searchQuery = ""; $("#story-search").value = ""; renderShelf(); $("#story-search").focus(); });

  function taskBrief(story) {
    const lines = [`# ${story.id} · ${story.title} · 创作任务书`, "", `整理日期：${archive.updated}`, `阶段：${stageName(story)}；未生成、未选定实施`, `参考来源：${research.source.url}`, "", "## 创作意图", "", `- 一句话：${story.logline}`, `- 愿望：${story.wish}`, `- 情绪：${story.tone}`, `- 核心规则：${story.rule}`, `- 目标时长：${story.duration ? `约${story.duration}秒，仅为草案` : "待确定；故事种子不能按时长承诺制作"}`, "- 画幅、受众、渠道、工具与预算：待本次制作确认", "", "## 故事全文", "", story.story, "", "## 场景与承接", ""];
    story.scenes.forEach((scene, i) => lines.push(`### ${i + 1}. ${scene.time} · ${scene.place}`, "", scene.action, "", `进入下一段的依据：${scene.connection}`, ""));
    lines.push("## 连续性资产", "", ...story.assets.map((asset) => `- [ ] ${asset}`), "", "## 先试什么", "", story.test, "", `风险：${story.risk}`, "", "## 仍需补齐", "", story.gap, "", ...story.next.map((step) => `- [ ] ${step}`), "", "## 生成后记录", "", "- 实际工具、模型和参数：", "- 实际提交的提示词：", "- 输入素材及其角色、权利：", "- 返回任务标识与原件位置：", "- 完整听看与连续性检查：", "- 未通过之处及返修：", "", "## 验收问题", "", "- [ ] 能看懂愿望、动作与变化之间的关系。", "- [ ] 每个场景推进故事或展开世界。", "- [ ] 人物、物件和光色连续。", "- [ ] 结尾回应前面的愿望或关系。", "- [ ] 完整听看成片，分别记录视觉、声音与技术结果。", "", "本文为准备材料，不代表已提交生成，也不包含未经执行的模型或成本结论。", "");
    return lines.join("\n");
  }

  $("#story-reader").addEventListener("click", (event) => {
    if (!event.target.closest("#export-story")) return;
    const story = byId.get(selectedStory);
    const url = URL.createObjectURL(new Blob([taskBrief(story)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${story.id}-${story.title}-创作任务书.md`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    $("#download-status").textContent = `已准备${story.title}的创作任务书下载；实际文件保存结果以浏览器提示为准。`;
  });

  renderReference(0);
  selectStory(selectedStory, { initial: true });
})();
