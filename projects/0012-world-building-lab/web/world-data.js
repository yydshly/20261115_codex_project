export const terrains = [
 {id:'valley',name:'溪谷山地',en:'VALLEY',tag:'河床 · 围合 · 林地',climate:'温润',water:2.1,tree:'oak',accent:'#6f8e65',description:'两侧坡地围合出低处河床，曲折的通路连接林地与小屋。',skeleton:'缓坡与河床形成高低关系，让水、道路与建筑有不同的位置。',surface:'草地铺缓坡，裸土沿通路展开，陡处露出岩面，河岸加入砂砾。',elements:'阔叶树、花草、岩石、小屋、木桥与行走人物组成可阅读的山谷片段。',question:'先关掉树木，看看道路与河流是否仍然读得懂。',landmark:'cottage'},
 {id:'hills',name:'起伏丘陵',en:'HILLS',tag:'圆丘 · 草坡 · 风车',climate:'温和',water:2.5,tree:'oak',accent:'#93a66c',description:'低缓圆丘连续起伏，用开阔草坡与稀疏树群形成田野。',skeleton:'较平缓的高差让视线连续，适合对比山谷的围合感。',surface:'草地占主体，低处更湿润，裸土道路提供方向。',elements:'树群、花带、农舍和风车为开阔地形建立地标。',question:'调高“地形起伏”，观察原来的缓坡怎样改变建筑与树林的关系。',landmark:'windmill'},
 {id:'canyon',name:'层岩峡谷',en:'CANYON',tag:'陡壁 · 沟谷 · 台阶',climate:'干燥',water:1.5,tree:'cactus',accent:'#b88462',description:'深沟两侧抬起层状台地，立体岩壁成为视觉主角。',skeleton:'窄沟、陡壁与台阶显露垂直空间，和缓坡是不同的地形骨架。',surface:'暖色岩层配合砂砾与少量裸土；植物覆盖明显减少。',elements:'柱状仙人掌、岩柱、木桥和瞭望塔强调跨越与观察。',question:'把同一骨架换成积雪，分清“形状变化”和“覆盖变化”。',landmark:'tower'},
 {id:'dunes',name:'风成沙丘',en:'DUNES',tag:'波纹 · 沙脊 · 绿洲',climate:'干热',water:3.4,tree:'palm',accent:'#c7a46d',description:'连续波状沙脊和局部低洼，形成少量绿洲与营地。',skeleton:'长向沙脊与起伏波形提供方向感，地表细纹与大沙丘分开表达。',surface:'沙地的暖色、细纹与背光面共同显示起伏；绿洲边缘保留湿土。',elements:'绿洲棕榈、岩块、帐篷和旅人只集中在少数位置。',question:'切到“地形骨架”，看看沙丘形状是否仍能辨认。',landmark:'tent'},
 {id:'alpine',name:'高山雪岭',en:'ALPINE',tag:'尖峰 · 岩脊 · 雪线',climate:'寒冷',water:6.2,tree:'pine',accent:'#8eabb4',description:'高山峰脊、低处湖盆与针叶林，展示高度带来的覆盖差异。',skeleton:'数个高峰与鞍部相连，坡度和海拔一起改变后续分布。',surface:'低处为草土，中段露岩，高处出现积雪；雪线是示意规则。',elements:'针叶树、积雪岩块、山屋与旅人让高山具有身体尺度。',question:'降低起伏后，看看坡度和自动覆盖范围怎样变化。',landmark:'cabin'},
 {id:'volcano',name:'火山盆地',en:'VOLCANO',tag:'锥体 · 环脊 · 火口',climate:'灼热',water:13.4,tree:'dead',accent:'#a8674f',description:'火山锥围绕内凹火口，黑色岩地与局部熔岩形成强烈对照。',skeleton:'外侧山锥与中心凹陷共同构成火口，而不只是一个尖锥。',surface:'玄色岩地与灰烬色差示意不同表面；没有地质模拟。',elements:'枯木、黑色岩块、熔岩池与观察站强调环境条件。',question:'关闭“水体与熔岩”，观察火口凹陷本身的形状。',landmark:'outpost'},
 {id:'island',name:'环海岛屿',en:'ISLAND',tag:'海岸 · 沙滩 · 内陆',climate:'海洋',water:2.8,tree:'palm',accent:'#6daca1',description:'中心抬起的岛体与外围浅滩，让海岸线自然显露。',skeleton:'岛心、缓坡、岸线与海床处于不同高度。',surface:'低处沙地、内陆绿地和局部岩面，形成从海到陆的过渡。',elements:'棕榈、沿岸岩石、木屋、码头与帆船建立海岛生活线索。',question:'切换三层，观察“海岸线”怎样由地形和水位一起形成。',landmark:'hut'},
 {id:'wetland',name:'浅水湿地',en:'WETLAND',tag:'低平 · 水洼 · 苇荡',climate:'湿润',water:4.7,tree:'willow',accent:'#7d9383',description:'微小高差就能形成浅水、水洼与露出的草地。',skeleton:'低平地形中的小幅起伏决定哪里露出、哪里被水覆盖。',surface:'湿泥、苔草与水岸过渡比高山的岩雪差异更细微。',elements:'柳树、芦苇、高脚屋、木栈道与水鸟适应低平浅水。',question:'小幅调整地形起伏，看看露出水面的土地怎样变化。',landmark:'stilt'},
 {id:'mesa',name:'侵蚀台地',en:'MESA',tag:'平顶 · 陡边 · 干沟',climate:'半干旱',water:0,tree:'scrub',accent:'#af936c',description:'平顶高台和较陡边缘，与连续圆丘形成对照。',skeleton:'阶梯状高台保留平坦顶部，周围低地切出沟槽。',surface:'砂岩、砂砾和零散草地突出层次；只是程序化形态示意。',elements:'低灌木、岩块、石拱和瞭望塔为高处建立观察点。',question:'比较“丘陵”和“台地”：高低类似，边缘与顶部却不同。',landmark:'arch'},
 {id:'coast',name:'海岸断崖',en:'COAST',tag:'海面 · 沙岸 · 崖顶',climate:'多风海岸',water:2.2,tree:'pine',accent:'#819c99',description:'一侧为海，一侧为逐渐抬高的陆地，形成海岸与崖顶。',skeleton:'横向高度变化决定海、沙岸和崖顶各处的位置。',surface:'沙地连接海面与草地，较陡部分露出岩层。',elements:'灯塔、海岸松、渔屋、码头和船只构成沿岸地标。',question:'从俯视切到低处观察，看看同一海岸如何改变观看感受。',landmark:'lighthouse'}
];

export const surfaces = [
 {id:'auto',name:'自然混合',color:'#72916a',note:'按高度、坡度与临水程度分配覆盖。'},
 {id:'grass',name:'草地',color:'#709054',note:'这里先展示地面覆盖；立起的草丛属于上层元素。'},
 {id:'soil',name:'裸土',color:'#997452',note:'较暖的土色与细颗粒，适合看通路和裸露地面。'},
 {id:'gravel',name:'砂砾',color:'#99958a',note:'细碎石粒与不规则色块，区别于连续岩面。'},
 {id:'rock',name:'岩面',color:'#858b86',note:'冷灰底色与裂隙纹理，强调裸露基岩。'},
 {id:'sand',name:'沙地',color:'#d3b67f',note:'细颗粒与流向细纹；地表沙纹和沙丘大形分开构建。'},
 {id:'snow',name:'积雪',color:'#e5eeec',note:'明亮低饱和覆盖，用阴影辨认同一块地形。'},
 {id:'mud',name:'湿泥',color:'#666e4e',note:'较深底色与湿润观感，适合观察低地与水岸。'},
 {id:'basalt',name:'火山岩',color:'#555453',note:'暗色粗糙表面与灰烬色差，和岩块模型分别处理。'}
];

export const layers = [
 {id:'trees',name:'树木与灌丛',note:'阔叶、针叶、棕榈、柳树、仙人掌与枯木'},
 {id:'groundcover',name:'草丛、花与芦苇',note:'真正立起的地表植被'},
 {id:'rocks',name:'岩块与岩柱',note:'独立立体物件，不是地形材质'},
 {id:'water',name:'水体与熔岩',note:'水位与低洼地形共同形成岸线'},
 {id:'buildings',name:'建筑与地标',note:'小屋、风车、帐篷、灯塔、瞭望塔等'},
 {id:'paths',name:'通路、桥与栈道',note:'路线示意，不代表已验证通行'},
 {id:'life',name:'人物、鸟与船',note:'提供尺度与活动线索，没有完整游戏 AI'}
];

export const assetTools = [
 ['inspect','观察地表'],['oak','放置阔叶树'],['pine','放置针叶树'],['palm','放置棕榈树'],['cactus','放置仙人掌'],['rock','放置岩块'],['flowers','放置花丛'],['cottage','放置小屋'],['tower','放置瞭望塔'],['person','放置人物'],['fence','放置木栏']
];
