import {makeScene2D,Rect,Txt,Line,Circle} from '@motion-canvas/2d';
import {all,createRef,waitFor} from '@motion-canvas/core';
export default makeScene2D(function*(view){
 view.fill('#142b24');
 const caption=createRef<Txt>(),packet=createRef<Circle>();
 const boxes=Array.from({length:4},()=>createRef<Rect>());
 view.add(<><Txt text="一次语义检索，发生了什么？" y={-350} fill="#ecf4e3" fontFamily="Microsoft YaHei" fontSize={60}/><Txt text="MOTION CANVAS · 流程图解" y={-260} fill="#91ac80" fontSize={24}/></>);
 const x=[-620,-210,210,620],labels=['你的问题','向量编码','相似度检索','相关资料'];
 for(let i=0;i<4;i++)view.add(<Rect ref={boxes[i]} x={x[i]} width={300} height={150} radius={25} fill="#263e33" stroke="#5b7750" lineWidth={3} opacity={1}><Txt text={labels[i]} fontFamily="Microsoft YaHei" fontSize={40} fill="#e5efdc"/></Rect>);
 for(let i=0;i<3;i++)view.add(<Line points={[[x[i]+160,0],[x[i+1]-160,0]]} stroke="#68805a" lineWidth={4} endArrow arrowSize={15}/>);
 view.add(<><Circle ref={packet} x={x[0]} y={120} size={24} fill="#d1ed8e" opacity={0}/><Txt ref={caption} text="点击播放，沿数据流理解四个步骤。" y={270} width={1550} textWrap fontFamily="Microsoft YaHei" fontSize={37} fill="#c8d9ba"/></>);
 yield*all(...boxes.map((b,i)=>b().opacity(1,.5+i*.15)));
 const texts=['你输入的问题，先进入编码模型。','编码模型把文字变成一组数字，表达语义。','用方向相似度比较问题向量与资料向量。','检索得到相关资料，交给后续回答流程。'];
 yield*packet().opacity(1,.4);
 for(let i=0;i<4;i++){
  caption().text(texts[i]);
  yield*all(packet().position.x(x[i],1),boxes[i]().fill('#526b39',.5));
  yield*waitFor(2.3);
  yield*boxes[i]().fill('#263e33',.4);
 }
 caption().text('适合表达：数据从哪来、经过哪一步、流向哪里。');
 yield*waitFor(3);
});
