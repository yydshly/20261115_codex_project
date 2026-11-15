const {defineConfig}=require('vite');
const motionCanvas=require('@motion-canvas/vite-plugin').default;
const fs=require('node:fs');const path=require('node:path');
module.exports=defineConfig({server:{host:'127.0.0.1',port:52843,strictPort:true},plugins:[motionCanvas({project:'./src/study-project.ts',output:'../../../../.local/case-canvas-frames'}),{name:'record-local-render',configureServer(server){server.middlewares.use('/record-render',(req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{try{const data=JSON.parse(body);if(![1,2].includes(data.revision))throw Error('revision');fs.writeFileSync(path.resolve(__dirname,'../../comparison/canvas-v'+data.revision+'.json'),JSON.stringify(data,null,2));res.end('ok')}catch{res.statusCode=400;res.end('invalid')}})})}}]});
