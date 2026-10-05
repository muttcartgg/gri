/* =========================================================
   09 · Main loop + boot
   ========================================================= */
let last=performance.now(),hudAcc=0,lastSbHidden=null;
function frame(now){
  const real=Math.min(.05,(now-last)/1000);last=now;
  if(lastSbHidden!==$('#sb').hidden){lastSbHidden=$('#sb').hidden;resize()}
  if(S.slowT>0){S.slowT-=real;S.ts=.32}else S.ts=Math.min(1,S.ts+real*2.5);
  const dt=real*S.ts;
  const active=!S.paused&&!['hub','boot','over','menu'].includes(S.phase);
  if(active){
    if(S.phase==='presnap'&&!S.conv){S.playClock-=real;if(S.playClock<=0)delayOfGame()}
    if(S.phase==='kick'){updateKick(real);drawKick()}
    if((S.phase==='live'||S.phase==='dead')&&play){const n=dt>.02?3:2;for(let i=0;i<n;i++)simulate(dt/n);if(S.phase==='dead'){deadT-=real;if(deadT<=0)applyResult()}}
    else for(const p of P){p.fallP=lerp(p.fallP,p.fallen?1:0,.12);p.z=Math.max(0,(p.z||0)-real*3)}
    updateParticles(dt);updateWeather(real);updateCam(real);draw(now);
    hudAcc+=real;if(hudAcc>.1){hudAcc=0;hud()}
  }
  requestAnimationFrame(frame);
}
addEventListener('pagehide',()=>flushSave());
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushSave()});
function boot(){resize();importLegacy();showSlots();requestAnimationFrame(t=>{last=t;frame(t)})}
boot();
