"use strict";
const navigationLinks=[...document.querySelectorAll("nav a")];
const navigationSections=navigationLinks.map(link=>document.querySelector(link.getAttribute("href")));
let queued=false;
function updateReadingPosition(){
  const available=document.documentElement.scrollHeight-innerHeight;
  document.querySelector(".reading-progress").style.width=`${available>0?Math.min(100,Math.max(0,scrollY/available*100)):0}%`;
  let current=-1;
  navigationSections.forEach((section,i)=>{if(section.getBoundingClientRect().top<=180)current=i;});
  navigationLinks.forEach((link,i)=>{link.classList.toggle("active",i===current);if(i===current)link.setAttribute("aria-current","location");else link.removeAttribute("aria-current");});
  queued=false;
}
addEventListener("scroll",()=>{if(!queued){queued=true;requestAnimationFrame(updateReadingPosition);}},{passive:true});
addEventListener("resize",updateReadingPosition);
updateReadingPosition();
