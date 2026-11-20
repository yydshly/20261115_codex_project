# 同一张地图的三条环境线

## 西南河口到东南深海

[沿 3D 海岸线前往深海](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=coast-sea#build-1)。从西南河口沿南侧水域绕到东部岩岸，再接清浅砂底、硬底礁坪、陆架、陆坡和海沟。海床剖面共用零米基准，可以切换潮相、揭海看床底、下潜看群落。深处分站用观察灯照亮邻近海床。

八个观察点的路线约 6.09 公里。南部外海在原地图南缘做了局部地形过渡，水路留在统一底图范围内。高潮下陆架、陆坡、海沟样点水深分别约为 68 米、162 米和 371 米。

固定水深 3 米比较吸光较强的河口和清浅海岸，沿近邻两站再核对海草在沙底扎根与造礁珊瑚在硬底附着。潮位使用现有相位和高程，西南河口的涨落幅度是局地场景设定。海水透明度、暖水礁坪和生物布点为教学设定，水深直接读取当前地图。场景不含多年礁体生长和潮流输运。

已在内置浏览器核对高潮与低潮的岩岸露淹、河口与清浅砂床的水下视角、礁坪珊瑚、海沟观察灯，以及切回海床剖视并返回东部岩岸环境线。[海洋对照回归脚本](scripts/check-coast-sea.mjs)

[NOAA · 海草生境](https://floridakeys.noaa.gov/plants/seagrass.html) · [NOAA · 造礁珊瑚的底质与光照条件](https://www.fisheries.noaa.gov/s3/2023-08/Final-Coral-CH-Information-Report-508.pdf)

## 西南迎风湿林到南部背风草地

[在 3D 原位切换雨季和旱季](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=rain-shadow#build-1)。从雨林河岸、迎风坡、主脊到疏林长草、浅沟湿草、砾土和干谷。七站共约 1.43 公里，可从「海岸到内陆」相应站点进入，切季节时保留位置。

7 月和 1 月沿用逐月风向、降雨和根区收支。雨林低滩的水位增量由西南河月出流量换算，水面受真实河床与通水路径限制。背风浅沟用当地根区水分驱动独立积水，雨林河水不越主脊进入浅沟。木本的间距固定，草与莎草在雨季更高、更绿，退水后在低处留湿。读数与水位为场景试算。

已在内置浏览器核对雨林岸和背风浅沟的原位换季、迎背风降雨读数，以及从南部接缝进入和返回。[南部两季回归脚本](scripts/check-warm-belt.mjs)

## 北部冷岸到青岚—雪岭

[在大地图打开冷岸与高山](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=cold#build-1)。可在「分区与形成 → 冷岸与高山」、环境缺口第三项或三条环境线中打开。

- 北岸低海拔线顺浮冰湾、苔原多边形地面、热融浅洼和冷坡林缘到混交林。切换 1 月和 7 月，从同一位置比较表土冻结、活动层、冰楔和浅洼积水。
- 高山线从青岚山脚乔木带上到海拔林线、冻融碎石坡与雪岭。沿雪岭冰斗和冰川中段到冰碛湖，可横切现有地形取得 U 形谷床，比较谷床和冰面位置。

两线用现有相对冷暖指标，把北向冷暖背景和高程扣减拆开读。林线色带表示适生条件。雪储来自同一套月度风雨和融雪数据，现场的雪斑还受实际坡度影响。冻土活动层、冰楔采用局地示意，热融浅洼的形状表示长期下沉后的地貌，季节切换表达它的冻结与积水。山谷切面读取现有谷床与冰体高程。

2026-11-20 在内置浏览器核对苔原站的冬夏切换、热融浅洼、U 形谷床与冰体剖面，以及从南北冷暖线进入和返回。既有雪岭步行和史前时间层也通过回归检查。[冷环境回归脚本](scripts/check-cold-environment.mjs)

[USGS · 冻土、活动层与多边形地面](https://pubs.usgs.gov/ha/ha730/ch_n/N-AKtext1.html) · [NPS · 冰斗、冰蚀谷与冰碛](https://www.nps.gov/glba/learn/nature/anatomy-of-a-glacier.htm)

[打开三线全图](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=lines#build-1)

三条线共用已有地形和水网。可以选站、逐站前进，或自动播放航拍线路。观察面板显示沿线剖面、站点高度以及冷暖、湿润和当月降雨指标。

三条线都可以叠加地质标记，或从选中的环境站跳到对应的地质站。回来时保留环境站与月份。[地质骨架与对应关系](TECTONICS.md)

开启「叠加岩性」可同时查看路线与岩性着色。「顺水」对照坡面径流与扇面入渗，「南北冷暖」对照风化母质，「海岸到内陆」连到干谷蓄水与绿洲泉池。[岩性与地下水](GROUNDWATER.md)

开启「叠加两条水路」会按 1 月或 7 月画出北部冲积扇至苇泽湿地的补给区与流向。从三条线可以分别定位北支汇口、湿地或地表分水岭，并回到原站与月份。[地表与地下水路](WATER-EXCHANGE.md)

三线也能在原地图叠加湿地分带。顺水从河道进入季节性湿地，南北冷暖从温带河谷对照河漫滩，海岸到内陆从水汽和保水差异对照苇泽。切入湿地视角会带入当前月份，返回会保留原站。[洪泛、退水与植被](WETLAND.md)

开启「标出河口潮界」可在原图查看当月高潮参考的水位边界与 5‰ 盐度前缘。进入河口可以切换四个潮段，返回保留原环境站和月份。[河口潮汐与咸淡水混合](ESTUARY.md)

| 观察线 | 地点顺序与形成逻辑 |
| --- | --- |
| [顺水](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=lines&focus=water#build-1) | 雪岭冰川、冰碛湖、融水源池、河谷坡脚、北部支流汇口、苇泽湿地、分汊河口、中央海湾。沿实际水道观察高差、汇流以及下游沉积。 |
| [南北冷暖](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=lines&focus=warmth#build-1) | 北境岸地、冷坡、针阔混交、温带河谷和平原、南部湿沟与暖坡、湿热林缘、红树林潮沟。冷暖大致随相对纬度变化，实景中的高差和水分产生局地例外。 |
| [海岸到内陆](https://yydshly.github.io/20261115_codex_project/demos/0012-world-building-lab/expedition.html?plan=lines&focus=inland#build-1) | 西南外海、浅岸红树林、迎风坡、南部山脊、背风林草坡、砾地、干谷和泉池。西南湿风、坡面抬升和背风干区串起主线，泉池提供局部湿润对照。 |

青白线为连通外海的格网海陆边界。金线沿现有山脉与丘脊。紫实线取 40 米高程格网上有不同已识别出口的邻域，区分中央、南部出海及西部内流等流域。浅紫虚线沿实际格网下坡方向，估算较大局地汇水区的分水边界。橙色箭头借用全年风雨的 1 月西北风、7 月西南湿风和夏季东南沿海补充水汽；切月同步更新原水量模型的三维水面。

参考了 [NASA 地球能量收支](https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/)、[WMO 迎风抬升及雨影](https://cloudatlas.wmo.int/en/orographic-influences-on-the-windward-side.html)和[USGS 流域与分水界](https://www.usgs.gov/water-science-school/science/watersheds-and-drainage-basins)。

## 现代通行复查

进「地理底图」选择接缝，查看剖面的绿色步行段和金色航拍段。雪岭至中央海湾另有一条可连续步行的地面路线。[标杆路线与四处剖面](MODERN-FOUNDATION.md)

## 已补进三维世界的过渡

北境冷坡到林缘、平原湿沟到竹林暖坡、湿林越岭到背风林草坡，新增三段渐变地表与低矮植被。地被落点检查坡度、水域、通路和原场景保留范围。水路延续已有河床、滩地和河口；在顺水线上可把月份和当前位置传给「流域收支」。

分水界采用教学格网和已有河网接点，湿度和季风为场景参数。三条线为航拍观察路线，跨河、越岭与入海段按镜头连续观察。

三条线共 22 站，水平距离约 2.57、4.83 和 2.36 公里。原河网各水位沿程检查，西部盐盆仍为地表无出流。三段过渡新增 322 处地被，分别为 141、120 和 61 处。南部山脊附近的估算分水线和迎风、背风两侧的雨量方向均有自动检查。[三线几何、植物落点与季节检查](scripts/check-environment-lines.mjs)

[三线全图](assets/environment-lines-overview.jpg) · [北部支流汇口](assets/environment-lines-water-junction.jpg) · [北境冷坡](assets/environment-lines-cold-transition.jpg) · [南部山脊与雨影](assets/environment-lines-rain-shadow.jpg) · [内置浏览器实测](assets/environment-lines-browser-check.json)
## 大地图上的降雨联动

“同一场雨的潮汐对照”从三条环境线打开同一个中央海湾流域试验。顺水线可从北支与苇泽进入，南北冷暖线可从温带河谷进入，海岸到内陆线可从西南外海或迎风坡进入。四站共享雨量、潮汐情景和时刻，返回时保留原环境线的站点与月份。[试算与观察方法](STORM.md)

“泥沙与岸线”从相同的站点进入本场泥沙观察，复用已设置的雨量、潮相和时刻。再打开“多场岸线”，可逐步查看两种潮相交替经历多场洪水后改变的沙脊、露滩和岸线。[单场泥沙和多场演变](STORM.md#本场泥沙与多场岸线)

每条线的“滩地植被”都从当前站点进入中央河口，沿用已选的岸线底床。可切换同一片新滩的演替年限或复冲对照，返回原环境线时保留原站点和月份。[植被演替与护岸试验](STORM.md#新滩地的植被演替与护岸)

三条线的“海面与风暴潮”从当前站点进入同一片中央河口潮滩，沿用岸线底床和植被年限，并保留海面抬升、风暴增水和当前对照阶段。[淹水、冲刷与植被迁移](STORM.md#海平面抬升风暴潮与植被迁移)
