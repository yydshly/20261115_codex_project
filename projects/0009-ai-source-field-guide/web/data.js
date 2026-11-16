/* Public, manually curated notes. Snapshot: 2026-11-15—16, Asia/Shanghai. */
"use strict";
window.sourceGuide = {
  platforms: [
    {id:"github",name:"GitHub",symbol:"GH",color:"#e4e8ed",ink:"#354358",groups:["discover","collaborate"],description:"代码、版本与问题记录，研究开源项目的主要入口。",level:"主要入口",core:true,how:"先看周榜寻找候选，再检查 README、许可证、近期提交和 Issue。打开一个具体问题，观察维护者如何解释和处理。",limit:"Star 数和榜单反映关注度；项目适配程度、维护状况与实际能力仍需要单独核验。",links:[["Trending 周榜","https://github.com/trending?since=weekly"],["项目讨论示例：llama.cpp","https://github.com/ggml-org/llama.cpp/discussions"]]},
    {id:"huggingface",name:"Hugging Face",symbol:"HF",color:"#f1e8c8",ink:"#9b7b25",groups:["discover","learn","collaborate"],description:"模型、论文、数据与演示连接在一起，方便沿来源继续探索。",level:"主要入口",core:true,extra:true,how:"从模型榜、论文榜或在线演示切入，追到模型卡、论文和代码。遇到具体用法问题，再到官方论坛搜索。",limit:"论文排名、社区投票和演示效果各有边界。模型许可与软件许可要分别查看；在线演示不能代替本地测试。",links:[["模型榜","https://huggingface.co/models?sort=trending"],["论文榜","https://huggingface.co/papers/trending"],["在线演示","https://huggingface.co/spaces"],["社区论坛","https://discuss.huggingface.co/"]]},
    {id:"reddit",name:"Reddit",symbol:"r/",color:"#f4e2d6",ink:"#c06b40",groups:["discover","feedback"],description:"找具体用户的部署经验、模型讨论与失败案例。",level:"围绕项目查",core:true,how:"优先看 r/LocalLLaMA 的项目展示与实测；用具体模型、工具或报错搜索，核对硬件配置、版本和测试方法。",limit:"有价值的实测与行业新闻、观点争论混在一起。个人体验未必适用于你的环境，评论中的结论还需要追到证据。",links:[["r/LocalLLaMA","https://www.reddit.com/r/LocalLLaMA/"]]},
    {id:"hackernews",name:"Hacker News",symbol:"Y",color:"#f5e6d5",ink:"#b87938",groups:["discover","feedback"],description:"发现开发者作品，阅读作者答复与技术质疑。",level:"每周选读",how:"从 Show HN 看新作品，再进入评论和项目原址。留意作者怎样回答性能、成本、部署与替代方案的问题。",limit:"Show HN 不限 AI，也不保证全部开源。评论是研究线索，仍需核对原项目及其许可证。",links:[["Show HN","https://news.ycombinator.com/show"],["首页","https://news.ycombinator.com/"]]},
    {id:"substack",name:"Substack",symbol:"S",color:"#f2e3d7",ink:"#b9663b",groups:["learn"],description:"围绕作者和专栏，连续阅读同一领域的分析。",level:"少量长期订阅",how:"先读几篇免费内容，确认作者是否给出原始引用、实验与判断边界。选择两三位与当前问题匹配的作者，再考虑持续订阅。",limit:"付费和长篇幅都不能单独保证质量。作者的观点与研究事实需要分开；读得深入也要衡量是否贴合自己的用途。",links:[["Ahead of AI","https://magazine.sebastianraschka.com/"],["官方读者指南","https://support.substack.com/hc/en-us/articles/33655200073620-A-reader-s-guide-to-Substack"]]},
    {id:"medium",name:"Medium",symbol:"M",color:"#e5e9df",ink:"#51634c",groups:["learn"],description:"围绕具体问题，寻找教程、实现过程和项目复盘。",level:"按问题搜索",how:"从工具名、报错或技术问题切入。阅读时检查文章日期、依赖版本、代码和实验条件，继续追到原始来源。",limit:"平台推荐和热门标题不能代替内容核验。这里的教程需要逐篇检查；搜索到旧版本文章时尤其注意适用性。",links:[["LLM 主题入口","https://medium.com/tag/large-language-models"],["官方关注说明","https://help.medium.com/hc/en-us/articles/35754720183063-Follow-writers-and-publications"]]},
    {id:"producthunt",name:"Product Hunt",symbol:"P",color:"#f0e0db",ink:"#bd6753",groups:["discover"],description:"发现新产品、观察工具怎样呈现使用场景。",level:"有需要时看",how:"看到感兴趣的 AI 产品后，进入官网和代码仓库，核实功能、定价、数据去向与开源情况，再安排一次试用。",limit:"产品发布信息带有推广目的。榜单成绩与产品适用性需要分别判断，也要确认是否有真正可获取的源码。",links:[["产品发布入口","https://www.producthunt.com/"]]},
    {id:"linkedin",name:"LinkedIn",symbol:"in",color:"#dfe9ef",ink:"#47758f",groups:["learn","collaborate"],description:"跟踪具体从业者、团队的公开动态与经验分享。",level:"按人关注",how:"围绕你研究的项目寻找作者和团队，阅读他们公开分享的工程经验、招聘方向与产品更新，再追到正式公告。",limit:"个人品牌和企业宣传可能影响表达。公开自述适合提供线索，技术能力和产品效果仍要核验。",links:[["职业社区入口","https://www.linkedin.com/"]]},
    {id:"discord",name:"Discord",symbol:"D",color:"#e4e5f5",ink:"#6a6ea4",groups:["feedback","collaborate"],description:"进入特定项目的社区，提问、查讨论、了解开发进展。",level:"使用项目后加入",how:"从项目官网或 README 的官方链接加入。先搜索已有问题、查看公告；提问时附上版本、运行环境和最小复现。",limit:"价值来自具体服务器和频道。聊天信息可能零散，重要结论最好追到 Issue、文档或正式版本说明。",links:[["Discord 官网","https://discord.com/"],["从 Hugging Face 官网寻找社区入口","https://huggingface.co/"]]},
    {id:"telegram",name:"Telegram",symbol:"T",color:"#dfeaf0",ink:"#5b879f",groups:["feedback","collaborate"],description:"跟踪已确认来源的频道，接收项目公告与交流。",level:"有明确来源再加入",how:"优先通过项目官网或维护者提供的链接加入。把频道消息视作线索，涉及版本和能力的结论再回到正式资料确认。",limit:"传播快不能证明准确。本轮没有逐一审阅具体 Telegram 频道，因此不提供未经核实的群组推荐。",links:[["Telegram 官网","https://telegram.org/"]]},
    {id:"threads",name:"Threads",symbol:"@",color:"#e7e8e3",ink:"#525c52",groups:["discover","feedback"],description:"补充关注创作者和开发者的公开交流。",level:"可选入口",how:"已有想关注的人时使用；从具体作品和作者开始，沿他们提供的项目、文章与代码链接继续阅读。",limit:"本轮官网抓取遇到 429 限流，未进一步核对其内容样本。这里保留原帖中的平台项，不把它列为 AI 研究的主要入口。",links:[["Threads 官网（本轮抓取受限）","https://www.threads.com/"]]}
  ],
  authors: [
    {name:"Simon Willison",initials:"SW",label:"LLM 实践 / 开源开发",url:"https://simonwillison.net/tags/llms/",focus:"模型与工具的动手实验，连接实际项目、代码和演示。",start:"适合当前找工具、做项目的用途；优先读与你任务相关的实验记录。"},
    {name:"阮一峰",initials:"阮",label:"中文周刊 / 工具发现",url:"https://www.ruanyifeng.com/blog/weekly/index.html",focus:"开源工具、开发资源与技术趋势，范围不限于 AI。",start:"每周寻找一个值得继续研究的项目，再回到原始仓库核对。"},
    {name:"Andrej Karpathy",initials:"AK",label:"神经网络 / LLM 教学",url:"https://karpathy.ai/",focus:"通过教学视频与小型实现理解模型的基本原理。",start:"想补基础时，从主页的 Zero to Hero、视频与 GitHub 入口开始。"},
    {name:"Sebastian Raschka",initials:"SR",label:"模型结构 / 研究解读",url:"https://sebastianraschka.com/blog/",focus:"LLM 架构、训练、推理与研究论文的系统讲解。",start:"适合想读懂技术细节时深入；Ahead of AI 是他的专栏入口。"},
    {name:"Hamel Husain",initials:"HH",label:"AI 评估 / 错误分析",url:"https://hamel.dev/",focus:"测量 AI 产品效果，分析失败，改进系统。",start:"想判断演示能否转成可靠功能时，可先看他的 AI Evals 指南。"},
    {name:"Eugene Yan",initials:"EY",label:"系统工程 / 产品实践",url:"https://eugeneyan.com/start-here/",focus:"AI 系统、搜索推荐、评估与产品工程实践。",start:"从单个工具进入完整系统设计时，按主页主题选择文章。"},
    {name:"宝玉",initials:"宝",label:"中文解读 / AI 编程",url:"https://baoyu.io/",focus:"AI 编程实践、工程文章解读与翻译。",start:"作为中文阅读入口；重要技术结论继续追到所引原文。"}
  ],
  repos: [
    {name:"llama.cpp",owner:"ggml-org",url:"https://github.com/ggml-org/llama.cpp",focus:"本地 LLM 推理。",watch:"关注模型支持、硬件适配、性能变化与用户讨论。",license:"MIT"},
    {name:"vLLM",owner:"vllm-project",url:"https://github.com/vllm-project/vllm",focus:"LLM 推理与服务。",watch:"关注服务部署、新模型接入和性能问题。",license:"Apache-2.0"},
    {name:"LangGraph",owner:"langchain-ai",url:"https://github.com/langchain-ai/langgraph",focus:"Agent 开发。",watch:"关注工作流实现、示例和版本变化。",license:"MIT"},
    {name:"Transformers",owner:"huggingface",url:"https://github.com/huggingface/transformers",focus:"模型训练与推理框架。",watch:"关注模型实现、使用示例和兼容性问题。",license:"Apache-2.0"}
  ],
  paths: {
    find:{title:"例：找到一个适合自己的中文文档检索工具",steps:[
      {title:"发现候选",text:"从 GitHub、Hugging Face 或 Show HN 找到项目，先保留一两个。"},
      {title:"核对条件",text:"回到仓库，检查许可证、运行要求、模型与数据处理方式。"},
      {title:"补充经验",text:"查 Issue、社区反馈和实践文章，寻找与你环境相近的案例。"},
      {title:"最小验证",text:"使用可公开的样本文档测试，记录能做什么、哪里失败。"}
    ]},
    evaluate:{title:"例：判断一个新出现的 AI Agent 是否值得研究",steps:[
      {title:"拆开声明",text:"写下作者声称的能力，区分演示、测评和已经发布的功能。"},
      {title:"查原始证据",text:"检查代码、版本记录、测试方法与失败案例；追到原作者。"},
      {title:"看维护回应",text:"读 Issue 和技术讨论，关注问题怎样得到解释与处理。"},
      {title:"限定结论",text:"只记录你实际验证过的范围，保留未确认项与适用条件。"}
    ]},
    understand:{title:"例：弄懂一个本地模型为什么更省内存",steps:[
      {title:"明确问题",text:"区分参数规模、量化、上下文长度与推理方式，缩小问题。"},
      {title:"读完整解释",text:"从 Raschka 等作者的相关长文进入，整理关键概念。"},
      {title:"追到原资料",text:"沿引用查看论文、模型卡和实现，核对解释对应的版本。"},
      {title:"做对照实验",text:"保持其余条件一致，对比内存、速度与结果质量。"}
    ]}
  },
  sources: [
    {title:"原帖 · 杨小乱的十个平台清单",url:"https://x.com/yxl44/status/2121581932412895507",note:"2026-11-15 内置浏览器读到完整正文；效率承诺是原作者声明，未见统计依据。"},
    {title:"GitHub Trending 周榜",url:"https://github.com/trending?since=weekly",note:"发现入口；本页的优先级与使用建议为整理判断。"},
    {title:"Hugging Face · Trending Papers 机制",url:"https://huggingface.co/changelog/trending-papers",note:"官方说明该榜单使用近期 GitHub Star 活动；不把热度等同于质量。"},
    {title:"Hugging Face · 模型、演示与论坛",url:"https://huggingface.co/",note:"模型榜、Spaces 与官方论坛入口已查看；未对所有模型做性能验证。"},
    {title:"r/LocalLLaMA",url:"https://www.reddit.com/r/LocalLLaMA/",note:"查看页面样本，包含项目展示、硬件实测及行业讨论；未采纳评论为独立事实。"},
    {title:"Hacker News · Show HN",url:"https://news.ycombinator.com/show",note:"查看项目展示入口；作品是否开源需逐项检查。"},
    {title:"Substack · 读者订阅说明",url:"https://support.substack.com/hc/en-us/articles/360037830631-How-do-readers-subscribe-to-my-Substack-publication",note:"用于核对免费订阅、邮件与 App 分发方式。"},
    {title:"Substack · 支付与订阅方案",url:"https://support.substack.com/hc/en-us/articles/18687769631252-How-can-readers-pay-for-a-subscription-on-my-Substack-publication",note:"用于核对按具体刊物选择订阅方案；本页不记录易变化的价格。"},
    {title:"Medium · 关注作者和刊物",url:"https://help.medium.com/hc/en-us/articles/35754720183063-Follow-writers-and-publications",note:"用于核对作者、刊物与邮件关注机制。"},
    {title:"Medium · 会员说明",url:"https://help.medium.com/hc/en-us/articles/115004545567-Become-a-Medium-Member",note:"用于核对会员限定文章的阅读机制；不记录价格。"},
    {title:"Medium · LLM 主题页",url:"https://medium.com/tag/large-language-models",note:"2026-11-16 查看主题入口；未逐篇审阅其推荐文章。"},
    {title:"Simon Willison · LLM 实践记录",url:"https://simonwillison.net/tags/llms/",note:"查看过含运行命令、实际项目和演示链接的内容样本。"},
    {title:"Sebastian Raschka · Blog and Notes",url:"https://sebastianraschka.com/blog/",note:"查看模型结构、训练与推理相关文章目录。"},
    {title:"Hamel Husain · AI Evals 指南",url:"https://hamel.dev/blog/posts/evals-faq/",note:"用于进一步阅读评估、错误分析与 AI 产品测试方法。"},
    {title:"其他作者主页与四个仓库",url:"https://eugeneyan.com/start-here/",note:"Eugene Yan、Karpathy、宝玉、阮一峰主页及四个仓库已核对；各自完整链接见上方清单。仓库信息核对于 2026-11-15。"},
    {title:"Product Hunt / LinkedIn / Telegram / Discord",url:"https://www.producthunt.com/",note:"2026-11-16 查看官方入口与平台介绍；未登录、未加入具体群组或频道。各自链接见地图。"},
    {title:"Threads · 本轮访问受限",url:"https://www.threads.com/",note:"2026-11-16 抓取返回 429，未核对内容样本；在地图中明确保留这一限制。"}
  ]
};
