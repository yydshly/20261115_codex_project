"""Read an asset's own skeleton and clips. This is an eligibility check, not a quality verdict."""
import argparse,json,struct,hashlib
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('file',type=Path);parser.add_argument('--require-native',action='store_true');args=parser.parse_args()
data=args.file.read_bytes();magic,version,size=struct.unpack_from('<III',data)
assert magic==0x46546c67 and version==2 and size==len(data),'Invalid GLB header'
length,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a,'Missing glTF JSON'
doc=json.loads(data[20:20+length]);nodes=doc.get('nodes',[]);skins=doc.get('skins',[]);animations=doc.get('animations',[])
clips=[{'name':a.get('name',''),'channels':len(a.get('channels',[]))} for a in animations]
skinned=[n for n in nodes if 'skin' in n and 'mesh' in n];joints=set(j for s in skins for j in s.get('joints',[]))
animated_joints=set(c['target']['node'] for a in animations for c in a.get('channels',[]) if 'node' in c['target']) & joints
report={'file':args.file.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'skinnedMeshes':len(skinned),'joints':len(joints),'animatedJoints':len(animated_joints),'clips':clips,'generator':doc.get('asset',{}).get('generator','')}
print(json.dumps(report,indent=2,ensure_ascii=False))
if args.require_native:
 assert skinned and animated_joints,'No original animated skeleton in the file'
 names=[a['name'].lower() for a in clips]
 assert any('walk' in s for s in names),'Missing original walking clip'
 assert any('eat' in s or 'graz' in s for s in names),'Missing original feeding clip'
