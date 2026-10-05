/* =========================================================
   06 · Canvas, camera transform, touch & keyboard input
   ========================================================= */
const cv=$('#field'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,sc=12,topY=80,cam={x:45,y:CEN,z:1};
const scE=()=>sc*cam.z;
const midY=()=>topY+(H-topY)/2;
const X=x=>(x-cam.x)*scE()+W/2, Y=y=>(y-cam.y)*scE()*VY+midY();
function resize(){
  DPR=Math.min(3,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';
  topY=($('#sb').hidden?60:$('#sb').getBoundingClientRect().bottom)+6;
  const av=H-topY;sc=Math.min(W/30,Math.max(av/(60*VY),W/72));
  resizeRetro();
}
addEventListener('resize',resize);
const aimScale=()=>maxRange()/(Math.min(W,H)*.55);
function updateAim(){
  if(!touch||touch.mode!=='aim'||!play||play.thrown||S.phase!=='live'){aim=null;return}
  const k=aimScale(),mr=maxRange();let ax=(touch.sx-touch.x)*k,ay=(touch.sy-touch.y)*k/VY;const d=hyp(ax,ay);if(d>mr){ax*=mr/d;ay*=mr/d}
  const dd=Math.min(d,mr);aim={x:Q.x+ax,y:Q.y+ay,err:aimError(dd,S.bullet),bullet:S.bullet};
}
cv.addEventListener('pointerdown',e=>{
  ac();if(S.paused)return;
  if(S.phase==='kick'){kickTap();return}
  if(S.phase!=='live'||!play)return;
  if(touch&&touch.mode==='aim'&&e.pointerId!==touch.id){S.bullet=!S.bullet;$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet));updateAim();return}
  if(touch)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const t={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t0:performance.now(),moved:0};
  if(play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q)t.mode='aim?';else if(isRunner())t.mode='steer';else return;
  touch=t;
});
cv.addEventListener('pointermove',e=>{
  if(!touch||e.pointerId!==touch.id)return;
  touch.x=e.clientX;touch.y=e.clientY;touch.moved=Math.max(touch.moved,hyp(touch.x-touch.sx,touch.y-touch.sy));
  if(touch.mode==='aim?'&&touch.moved>10)touch.mode='aim';
  if(touch.mode==='aim')updateAim();
});
function up(e){
  if(!touch||e.pointerId!==touch.id)return;const t=touch;touch=null;
  if(S.phase!=='live'||!play){aim=null;return}
  if(t.mode==='aim'&&aim&&!play.thrown){if(hyp(aim.x-Q.x,aim.y-Q.y)>2.5)throwBall(aim.x,aim.y,S.bullet);aim=null;return}
  if(t.mode==='aim?'&&!play.thrown){play.scramble=true;play.scrT=play.t;if(!S.conv){S.stats.rushAtt++;ps(Q).ra++}hint('Scramble! Hold above/below to steer · flick to juke · tap to hurdle');$('#bulletBtn').hidden=true;aim=null;return}
  if(t.mode==='steer'&&play.carrier&&isRunner()){
    const dtm=performance.now()-t.t0;const ddx=t.x-t.sx,ddy=t.y-t.sy;
    if(dtm<300&&t.moved>26){
      if(Math.abs(ddx)>Math.abs(ddy)&&ddx>0)doDive();
      else if(Math.abs(ddy)>=Math.abs(ddx))doJuke(Math.sign(ddy)||1);
    }else if(dtm<240&&t.moved<14)doHurdle();
  }
}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
function doJuke(dir){if(play.jukeCD>0||play.dive>0)return;play.jukeT=.42;play.jukeCD=.9;play.jukeDir=dir;spawnTurf(play.carrier.x,play.carrier.y,5);sfx('cut')}
function doHurdle(){const c=play.carrier;if(play.hurdle>0||play.dive>0)return;play.hurdle=.5;play.hurdleOK=Math.random()<.45+(c.pl.spd-3)*.08+(c.pl.str-3)*.03}
function doDive(){if(play.dive>0||play.hurdle>0)return;play.dive=.38}
addEventListener('keydown',e=>{
  if(S.phase==='kick'&&(e.key===' '||e.key==='Enter')){e.preventDefault();kickTap();return}
  if(S.phase==='presnap'&&!e.repeat){const m={p:'pass',a:'pa',r:'run',q:'qbrun'};if(m[e.key]){ac();callPlay(m[e.key])}}
  if(S.phase==='live'&&play){
    if(e.key==='b'&&!play.thrown){S.bullet=!S.bullet;$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet))}
    if(isRunner()){if(e.key==='ArrowUp')doJuke(-1);if(e.key==='ArrowDown')doJuke(1);if(e.key==='ArrowRight')doDive();if(e.key===' '){e.preventDefault();doHurdle()}}
  }
});
