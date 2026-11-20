export * from '../web/runtime/three.module.js';
// Only the GPU renderer is replaced; geometry, scenes and constructor code remain real.
export class WebGLRenderer{constructor({canvas}={}){this.domElement=canvas;this.calls=0;}setPixelRatio(){}setSize(){}render(){this.calls++;}}
