export const HOUSE_DOOR={x:770,y:350};
export const HOME_ENTRY={x:480,y:510};
export const HOME_CUSHION={x:287,y:412};
export const HOME_WINDOW={x:510,y:324};
export const HOME_PLACES=[
  {id:'window',name:'窗边看看',x:510,y:330,action:'看看窗外'},
  {id:'hearth',name:'炉边歇息',x:252,y:381,action:'在炉边歇一会儿'},
  {id:'letter',name:'桌边读信',x:697,y:389,action:'读桌上的信'}
];
export function homeWalkable(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(x<93||x>867||y<282||y>535)return false;
  if(x>145&&x<282&&y<350)return false;
  if(x>671&&x<823&&y<367)return false;
  return !(x>326&&x<414&&y>399&&y<463);
}
export function createHome(){return {inside:false,lampOn:true,x:480,y:510,face:1,resting:false,inviteCat:false};}
export function readHome(value){
  const h=createHome(),s=value||{};
  h.inside=s.inside===true;h.resting=s.resting===true;h.lampOn=s.lampOn!==false;h.face=s.face===-1?-1:1;
  if(Number.isFinite(s.x)&&Number.isFinite(s.y)&&homeWalkable(s.x,s.y)){h.x=s.x;h.y=s.y;}
  return h;
}
export function nearestHomePlace(player){return HOME_PLACES.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)<66).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;}
