const {defineConfig}=require('vite');
const motionCanvas=require('@motion-canvas/vite-plugin').default;
module.exports=defineConfig({plugins:[motionCanvas()],build:{outDir:'../../web/public/motion-canvas',rollupOptions:{output:{entryFileNames:'project.js'}}}});
