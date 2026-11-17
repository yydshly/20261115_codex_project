"""Orthographic inspection of the retained GLB; no scene/browser screenshot is fabricated."""
from pathlib import Path
import io,json,struct,sys
import numpy as np
from PIL import Image,ImageDraw

here=Path(__file__).parent
blob=(here.parent.parent/'web/model-version/assets/models/life/cow.glb').read_bytes()
length=struct.unpack_from('<I',blob,12)[0];doc=json.loads(blob[20:20+length]);offset=20+length
binary=blob[offset+8:offset+8+struct.unpack_from('<I',blob,offset)[0]]
def accessor(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];size=np.dtype(dtype).itemsize
 return np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*size),size)).copy()
primitive=doc['meshes'][0]['primitives'][0];p=accessor(primitive['attributes']['POSITION']);n=accessor(primitive['attributes']['NORMAL']);uv=accessor(primitive['attributes']['TEXCOORD_0']);faces=accessor(primitive['indices']).reshape(-1,3)
material=doc['materials'][primitive['material']]['pbrMetallicRoughness'];image=doc['images'][doc['textures'][material['baseColorTexture']['index']]['source']];v=doc['bufferViews'][image['bufferView']];texture=np.asarray(Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB'))/255
mode=sys.argv[1] if len(sys.argv)>1 else 'source';dark_from=len(faces)
if mode!='source':
 p=np.fromfile(here/'.local'/f'{mode}-position.bin',dtype='<f4').reshape(-1,3);n=np.fromfile(here/'.local'/f'{mode}-normal.bin',dtype='<f4').reshape(-1,3);uv=np.fromfile(here/'.local'/f'{mode}-uv.bin',dtype='<f4').reshape(-1,2);faces=np.fromfile(here/'.local'/f'{mode}-indices.bin',dtype='<u4').reshape(-1,3);dark_from=json.loads((here/'.local'/f'{mode}.json').read_text())['darkFrom']
def render(label,right,up,toward,bounds):
 right=np.array(right,float);right/=np.linalg.norm(right);up=np.array(up,float);up/=np.linalg.norm(up);toward=np.array(toward,float);toward/=np.linalg.norm(toward)
 width,height=850,900;left,bottom,spanx,spany=bounds
 sx=(p@right-left)/spanx*(width-1);sy=(1-(p@up-bottom)/spany)*(height-1);depth=p@toward
 zbuffer=np.full((height,width),-np.inf);pixels=np.full((height,width,3),.87);light=np.array([.75,.65,.4]);light/=np.linalg.norm(light)
 eligible=np.arange(len(faces)) if mode=='walk' else np.flatnonzero(np.max(p[faces,2],axis=1)>.78)
 for face_id in eligible:
  tri=faces[face_id]
  x,y=sx[tri],sy[tri];xmin=max(0,int(np.floor(x.min())));xmax=min(width-1,int(np.ceil(x.max())));ymin=max(0,int(np.floor(y.min())));ymax=min(height-1,int(np.ceil(y.max())))
  if xmin>xmax or ymin>ymax:continue
  denominator=(y[1]-y[2])*(x[0]-x[2])+(x[2]-x[1])*(y[0]-y[2])
  if abs(denominator)<1e-8:continue
  xx,yy=np.meshgrid(np.arange(xmin,xmax+1)+.5,np.arange(ymin,ymax+1)+.5)
  a=((y[1]-y[2])*(xx-x[2])+(x[2]-x[1])*(yy-y[2]))/denominator;b=((y[2]-y[0])*(xx-x[2])+(x[0]-x[2])*(yy-y[2]))/denominator;c=1-a-b
  z=a*depth[tri[0]]+b*depth[tri[1]]+c*depth[tri[2]];target=zbuffer[ymin:ymax+1,xmin:xmax+1];mask=(a>=0)&(b>=0)&(c>=0)&(z>target)
  if not mask.any():continue
  weights=np.stack([a[mask],b[mask],c[mask]],axis=1);tex=weights@uv[tri];tx=np.minimum(texture.shape[1]-1,np.maximum(0,(tex[:,0]*texture.shape[1]).astype(int)));ty=np.minimum(texture.shape[0]-1,np.maximum(0,(tex[:,1]*texture.shape[0]).astype(int)))
  normal=weights@n[tri];shade=.48+.52*np.maximum(0,normal@light);col=texture[ty,tx]*shade[:,None] if face_id<dark_from else np.tile(np.array([.09,.055,.045]),(len(weights),1));pixels[ymin:ymax+1,xmin:xmax+1][mask]=col;target[mask]=z[mask]
 image=Image.fromarray(np.uint8(np.clip(pixels,0,1)*255));draw=ImageDraw.Draw(image)
 if np.allclose(up,[0,1,0]):
  for value in [.94,.96,.98,1.,1.025,1.06,1.10,1.14]:
   y=int((1-(value-bottom)/spany)*(height-1));draw.line((0,y,35,y),fill='red',width=2);draw.text((40,y-8),f'Y={value:.3f}',fill='red')
 draw.text((12,12),label+' - '+mode+' CPU diagnostic, not browser',fill='black');image.save(here/f'{label}-{mode}.png')
if mode=='walk':render('body-side',[0,0,1],[0,1,0],[1,0,0],[-1.4,-.08,2.9,1.7])
else:
 render('head-side',[0,0,1],[0,1,0],[1,0,0],[.78,.89,.47,.53])
 render('head-front',[1,0,0],[0,1,0],[0,0,1],[-.08,.89,.56,.53])
