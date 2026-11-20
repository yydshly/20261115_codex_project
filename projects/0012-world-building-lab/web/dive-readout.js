export function mountDiveReadout(document){
  const readout=document.createElement('aside');
  readout.className='dive-readout';readout.hidden=true;
  readout.setAttribute('aria-label','下潜观察读数');
  const title=document.createElement('strong');
  title.setAttribute('aria-live','polite');
  const stats=document.createElement('div');
  const depth=document.createElement('b'),lighting=document.createElement('span'),cameraDepth=document.createElement('span');
  const detail=document.createElement('p');
  stats.append(depth,lighting,cameraDepth);
  readout.append(title,stats,detail);document.body.append(readout);
  return {
    show({name,waterDepth,naturalLight,habitat}){
      title.textContent=name;
      depth.textContent='站点水深 '+waterDepth;
      lighting.textContent=naturalLight?'自然底光 '+naturalLight+' · 已补光':'观察灯已开启';
      detail.textContent=habitat;
      readout.hidden=false;
    },
    setCameraDepth(depth){
      const text='镜头深度 '+Math.max(0,depth).toFixed(1)+' m';
      if(cameraDepth.textContent!==text)cameraDepth.textContent=text;
    },
    hide(){readout.hidden=true;}
  };
}
