const response=await fetch('./native-asset.json');
if(!response.ok)throw new Error('无法读取原生动画资产状态');
const asset=await response.json();
if(asset.status==='ready'&&asset.verified&&asset.file)await import('./main.js');
else location.replace('./');
