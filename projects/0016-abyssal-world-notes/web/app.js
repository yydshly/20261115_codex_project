(() => {
  'use strict';
  const sourceRoot = 'https://github.com/Noniv/abyssal-garden/blob/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf/source/src/';
  const scenes = [
    {image:'overview-live.jpg',name:'鲸尾与海藻森林',alt:'鲸尾石雕、海藻森林与水下鱼群的实际运行画面',theme:'空间的尺度',title:'让人记住一个地方',description:'巨大的鲸尾成为视觉锚点。高耸的海藻围住它，鱼群和漂浮颗粒把空隙变成有生命的水体。',details:[['空间','近处叶片、中景鲸尾、远处岩壁，形成前后层次。'],['光色','水面明亮，深处转蓝；远处的轮廓被水体柔化。'],['动态','运行时可见植被摆动、鱼群游动和颗粒漂移；静态图只保留其中一刻。']]},
    {image:'shipwreck-live.jpg',name:'沉船与岩石峡谷',alt:'沉船倾斜悬在岩石峡谷之间，蝠鲼从上方经过，阳光自水面透下的实测画面',theme:'构图与光线',title:'用一个地标，把视线带向深处',description:'沉船的斜线与两侧岩壁形成空间张力。上方蝠鲼给出尺度，透下的光把船体轮廓从蓝色水体中分离出来。',details:[['空间','船体成为峡谷中的主体，岩壁在两侧形成框景。'],['光色','明亮水面与深色船体产生反差，远景逐步融入雾中。'],['源码','world.js 为沉船设置支撑岩体和一侧受光斜坡；主体与周围地形存在明确安排。']]},
    {image:'purple-grotto-live.jpg',name:'紫色洞窟与光束',alt:'紫粉色地被、珊瑚、海绵和悬挑岩壁组成的洞窟实际运行画面',theme:'区域与情绪',title:'让同一片海，拥有不同的气质',description:'进入洞窟，青蓝水体里出现紫粉植物与浅色海绵。相似的岩石和海藻，通过颜色、光线与遮挡形成新的区域感。',details:[['空间','岩壁与悬挑围合出洞窟，保留向亮处展开的视线。'],['光色','紫粉色地被与冷青水色相遇，形成区别于主峡谷的视觉记忆。'],['源码','PURPLE 与 MAGENTA 区域参数控制配色分布；变化由空间规则参与组织。']]}
  ];
  const layers = [
    {title:'先有可辨认的空间，再用规则填充细节。',description:'主峡谷、沉船旁的受光斜坡、洞窟围墙和拱门都有明确的布局参数。生成器还围绕六个固定视点布置景物，为巡视路线保留空间。',example:'world.js 为主峡谷分别设置东西岩壁，并划出不生成随机岩体的区域；“程序化”并不等于所有东西都随机摆放。',transfer:'我们可以借鉴：先决定人在什么地方停留、看向哪里，再决定生成哪些细节。',source:'world.js'},
    {title:'颜色、深度与光束，共同建立水下感觉。',description:'源码按不同颜色通道处理光的吸收和雾中散射，叠加动态焦散、阴影与水面效果。半分辨率计算的光束经过深度感知模糊和上采样，与场景合成。',example:'远处的岩壁不是简单变暗：物体原有颜色随距离衰减，水体散射的光同时加入，逐渐形成青蓝色的纵深。',transfer:'我们可以借鉴：先在少量岩石与海床上调好光色，再加入大量内容，观察氛围能否独立成立。',source:'shaders.js'},
    {title:'用少量形态与分布规则，组织大量细节。',description:'海藻、海绵、珊瑚、鱼类和地标通过几何函数与参数生成。重复元素采用实例化，并按空间网格排序；海藻还使用不同距离的细分和密度。',example:'一个海藻叶片形态可以通过位置、长度、朝向和弯曲参数形成大量实例，而不是为每一片叶子保存一份独立模型文件。',transfer:'我们可以借鉴：把“长什么样”与“长在哪里”分开设计；需要精细主体时，也可以选择单独制作模型。',source:'world.js'},
    {title:'让变化有节奏，空间才有生命感。',description:'着色器驱动植物摆动、鱼和蝠鲼的运动；气泡与颗粒补充水体。Web Audio 在用户交互后合成低鸣、气泡、钟声与远处鲸鸣，不加载录音文件。',example:'audio.js 根据相机移动速度调整水流声；跳到预设视点的突变会被忽略，避免把瞬移当成急速游动。',transfer:'我们可以借鉴：让声音和动作回应人的移动，并给持续运动保留不同尺度与节奏。',source:'audio.js'},
    {title:'画面质量，需要和持续探索一起设计。',description:'High / Medium / Low 调整实例密度、阴影、抗锯齿与光束采样。运行中根据可用的 GPU 计时或帧间隔调整像素预算和显示距离，并保存结果。',example:'主循环先降低像素数到中间预算，再缩短植被与岩石的显示距离，仍不够时继续降低像素数；更快时按相反方向恢复。',transfer:'我们可以借鉴：先测固定路线的实际耗时，再决定减少哪些细节；平均 FPS 不能替代帧时间检查。',source:'main.js'}
  ];
  const byId = id => document.getElementById(id);
  let sceneIndex = 0;
  function wireTabs(selector, onChange, orientation='horizontal') {
    const tabs = [...document.querySelectorAll(selector)];
    const activate = index => {
      tabs.forEach((tab,i) => {
        const selected = i === index;
        tab.classList.toggle('active',selected);
        tab.setAttribute('aria-selected',String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      onChange(index,tabs[index]);
    };
    tabs.forEach((tab,index) => {
      tab.addEventListener('click',() => activate(index));
      tab.addEventListener('keydown',event => {
        let next;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else if (event.key === (orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight')) next = (index + 1) % tabs.length;
        else if (event.key === (orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft')) next = (index - 1 + tabs.length) % tabs.length;
        if (next !== undefined) {event.preventDefault();activate(next);tabs[next].focus();}
      });
    });
  }
  wireTabs('[data-scene]', (index,tab) => {
    sceneIndex = index;
    const scene = scenes[index];
    byId('scene-image').src = '../assets/' + scene.image;
    byId('scene-image').alt = scene.alt;
    byId('open-image').setAttribute('aria-label','放大' + scene.name + '截图');
    byId('scene-reading').setAttribute('aria-labelledby',tab.id);
    byId('scene-theme').textContent = scene.theme;
    byId('scene-title').textContent = scene.title;
    byId('scene-description').textContent = scene.description;
    byId('scene-details').replaceChildren(...scene.details.map(([name,text]) => {
      const row = document.createElement('div'),dt = document.createElement('dt'),dd = document.createElement('dd');
      dt.textContent = name;dd.textContent = text;row.append(dt,dd);return row;
    }));
  });
  wireTabs('[data-layer]', (index,tab) => {
    const layer = layers[index];
    byId('layer-reading').setAttribute('aria-labelledby',tab.id);
    byId('layer-title').textContent = layer.title;
    byId('layer-description').textContent = layer.description;
    byId('layer-example').textContent = layer.example;
    byId('layer-transfer').textContent = layer.transfer;
    byId('layer-source').href = sourceRoot + layer.source;
  },'vertical');
  let language = 'zh';
  let copying = false;
  wireTabs('[data-language]', (index,tab) => {
    language = tab.dataset.language;
    byId('prompt-zh').hidden = language !== 'zh';
    byId('prompt-en').hidden = language !== 'en';
    byId('download-prompt').href = '../assets/' + (language === 'zh' ? 'prompt-zh.txt' : 'prompt-original.txt');
    byId('copy-status').textContent = language === 'zh' ? '中文为本次完整翻译' : '英文保留上游原始文本';
  });
  const fallbackCopy = text => {
    const field = document.createElement('textarea');
    field.value = text;field.setAttribute('readonly','');field.style.position = 'fixed';field.style.opacity = '0';
    document.body.append(field);field.select();
    let result = false;
    try {result = document.execCommand('copy');} catch {} finally {field.remove();}
    return result;
  };
  byId('copy-prompt').addEventListener('click',async () => {
    if (copying) return;
    copying = true;
    const selectedLanguage = language;
    const text = byId('prompt-' + selectedLanguage).querySelector('pre').textContent;
    let copied = false;
    try {if (navigator.clipboard?.writeText) {await navigator.clipboard.writeText(text);copied = true;}} catch {}
    if (!copied) copied = fallbackCopy(text);
    byId('copy-status').textContent = copied ? (selectedLanguage === 'zh' ? '中文' : '英文') + '全文已复制' : '未能自动复制，请选取正文复制或下载文本';
    copying = false;
    byId('copy-prompt').focus();
  });
  const dialog = byId('image-dialog');
  byId('open-image').addEventListener('click',() => {
    const scene = scenes[sceneIndex];
    byId('dialog-image').src = '../assets/' + scene.image;
    byId('dialog-image').alt = scene.alt;
    byId('dialog-caption').textContent = scene.name + ' · 作者场景实测截图';
    dialog.showModal();
  });
  byId('close-image').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',event => {if (event.target === dialog) dialog.close();});
  const nav = [...document.querySelectorAll('.site-header nav a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) nav.forEach(link => {
        const active = link.hash === '#' + entry.target.id;
        link.classList.toggle('current',active);
        if (active) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      });
    },{rootMargin:'-20% 0px -65% 0px'});
    nav.forEach(link => observer.observe(document.querySelector(link.hash)));
  }
})();
