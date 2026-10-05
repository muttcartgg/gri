/* =========================================================
   05 · Game engine: formations, AI, passing, running, kicking,
        penalties, clock, college overtime, opponent drives
   ========================================================= */
const FW=53.33,CEN=FW/2,HASH1=23.58,HASH2=29.75,VY=.62;
const SPD={QB:6.6,RB:8.0,WR:8.4,TE:7.2,OL:4.8,DL:5.7,LB:7.0,CB:8.1,S:7.7,K:6};
const ACC={QB:7,RB:9,WR:9.5,TE:7,OL:6,DL:6,LB:6,CB:5,S:4.5,K:6};
const ROUTES={go:{w:[[28,0]]},slant:{w:[[2.5,0],[16,9]]},out:{w:[[9,0],[9.5,-11]]},dig:{w:[[12,0],[12.5,16]]},post:{w:[[11,0],[28,10]]},corner:{w:[[11,0],[24,-10]]},curl:{w:[[12,0],[10,1.5]],stop:true},comeback:{w:[[15,0],[12.5,-3.5]],stop:true},seam:{w:[[24,0]]},drag:{w:[[2,3],[5,24]]},flat:{w:[[1,-2.5],[3,-10]]},hitch:{w:[[6,0],[5,.5]],stop:true},check:{w:[[1.5,-3.5],[3,-5]],stop:true},wheel:{w:[[2,-6],[6,-9],[26,-9]]}};
const WRR=['go','slant','out','dig','post','corner','curl','comeback','hitch'],SLR=['slant','dig','seam','drag','out','curl'],TER=['seam','drag','out','curl','hitch'],RBR=['flat','check','flat','wheel'];
const DIFF=[.93,1,1.05,1.1];
const S={phase:'boot',home:null,away:null,game:null,score:[0,0],q:1,qlen:180,clock:180,playClock:25,los:35,ballY:CEN,down:1,firstDownX:45,conv:false,poss:'home',stats:null,pst:{},dxp:{},diffMul:1,ot:false,otRound:0,dc:null,to:[3,3],lastRunoff:0,wx:'Clear',slot:'Afternoon',ts:1,slowT:0,shake:0,bullet:false,paused:false};
let P=[],OFF=[],DEF=[],Q=null,RB=null,play=null,ball={state:'held',x:35,y:CEN,z:0},deadT=0,aim=null,touch=null,kick=null,cardNext=null,particles=[],tickTimer=null;
const newGameStats=()=>({att:0,comp:0,passYds:0,passTD:0,int:0,sacks:0,rushAtt:0,rushYds:0,rushTD:0,yac:0,passes:[],plays:0,firstDowns:0,thirdA:0,thirdC:0,rzA:0,rzTD:0,pen:0,penYds:0});
const focus=k=>!!(LG&&LG.focus===k);
const ps=p=>S.pst[p.pl.id]||(S.pst[p.pl.id]={pa:0,pc:0,py:0,ptd:0,int:0,ra:0,ry:0,rtd:0,rec:0,recy:0,rectd:0});
const dx=(pl,k,n)=>{const d=S.dxp[pl.id]||(S.dxp[pl.id]={xp:0,tkl:0,sck:0,dint:0});d[k]=(d[k]||0)+n};

/* stamina: linear drain over the game; endurance slows it; conditioning practice slows it more */
const progress=()=>S.ot?1:clamp(((S.q-1)*S.qlen+(S.qlen-S.clock))/(4*S.qlen),0,1);
const stamina=(pl,user)=>1-(.32-.05*pl.end)*(user&&focus('conditioning')?.7:1)*progress();
const condF=(pl,user)=>user?.88+.12*(pl.cond/100):1;
const moraleF=user=>user?.97+.06*(LG.morale/100):1;
function speedOf(role,pl,side){const u=side==='o';return SPD[role]*(.82+.06*pl.spd)*stamina(pl,u)*condF(pl,u)*moraleF(u)*(side==='d'?S.diffMul:1)*(S.wx==='Snow'?.95:1)}

function startUserGame(g,snap){
  hideAll();
  const u=T(LG.user),opp=T(g.h===LG.user?g.a:g.h);
  Object.assign(S,{game:g,home:u,away:opp,userHome:g.h===LG.user&&!g.neutral,neutral:!!g.neutral,qlen:LG.settings.qlen,diffMul:DIFF[LG.settings.diff]||1,wx:g.wx||'Clear',slot:g.slot||'Afternoon',ts:1,slowT:0,shake:0,paused:false,simmed:false,celebrate:null});
  muted=!!LG.settings.muted;
  S.dc={o:{},d:{}};for(const pos of POS_ORDER){S.dc.o[pos]=depth(u,pos);S.dc.d[pos]=depth(opp,pos)}
  if(snap){Object.assign(S,JSON.parse(JSON.stringify(snap.S)))}
  else Object.assign(S,{score:[0,0],q:1,clock:LG.settings.qlen,ot:false,otRound:0,to:[3,3],stats:newGameStats(),pst:{},dxp:{},lastRunoff:0,rzActive:false});
  lastScore=S.score.slice();resetRenderCaches();particles=[];
  document.documentElement.style.setProperty('--opp',opp.c1);
  $('#sb').hidden=false;$('#pauseBtn').hidden=false;
  if(snap){if(snap.pat){S.phase='pat';showPAT()}else toPresnap();toast('Game resumed')}
  else{startDrive(35);banner(g.rival?u.trophy:g.tag||'Kickoff',u.c1)}
}
function resumeGame(simRest){const g=userGameThisWeek();if(!g||!LG.live){LG.live=null;return showHub('home')}startUserGame(g,LG.live);if(simRest)setTimeout(simToFinal,50)}
function snapshot(pat){
  if(!LG)return;
  LG.live={wk:LG.week,opp:S.away.id,score:S.score.slice(),q:S.q,clock:S.clock,ot:S.ot,pat:!!pat,
    S:{score:S.score,q:S.q,clock:S.clock,los:S.los,ballY:S.ballY,down:S.down,firstDownX:S.firstDownX,conv:S.conv,ot:S.ot,otRound:S.otRound,to:S.to,stats:S.stats,pst:S.pst,dxp:S.dxp,lastRunoff:S.lastRunoff,rzActive:S.rzActive}};
  Saves.saveLive(SLOT,LG);
}
function startDrive(x){S.los=x;S.ballY=CEN;S.down=1;S.firstDownX=Math.min(110,x+10);S.conv=false;S.rzActive=false;toPresnap()}
function toPresnap(){
  S.phase='presnap';S.poss='home';S.playClock=25;play=null;aim=null;touch=null;S.bullet=false;S.celebrate=null;
  $('#bulletBtn').hidden=true;$('#bulletBtn').setAttribute('aria-pressed','false');
  if(!S.conv&&!S.rzActive&&S.los>=90){S.rzActive=true;S.stats.rzA++}
  setupFormation();showCall();snapshot();
  $('#toBtn').hidden=!(S.lastRunoff>0&&!S.ot&&S.to[S.q<=2?0:1]>0&&S.clock>0);
  hint('Routes are drawn. Call a play.');
}

function add(side,role,x,y,pl){
  const user=side==='o';
  const p={side,role,x,y,vx:0,vy:0,z:0,pl,num:pl.num,spd:speedOf(role,pl,side),acc:ACC[role],route:null,rpath:null,cont:null,wi:0,stop:false,stun:0,bt:0,immune:false,
    shed:role==='DL'?(R(1.6,3.4)-(pl.str-3)*.25)*(focus('running')?1.25:1):R(.4,1.1),assign:null,homeY:y,blocker:false,face:user?1:-1,phase:Math.random()*6.28,fallen:false,fallP:0,lunge:0,lungeCD:0,stiff:0,throwT:0,react:0,engaged:false};
  if(user&&LG.staff){const oc=LG.staff.oc;if(['WR','TE','RB'].includes(role))p.spd*=1+.01*(oc.r-3)+(oc.trait==='Play Caller'?.03:0)}
  P.push(p);(user?OFF:DEF).push(p);return p;
}
function setRoute(p,name,dir){
  const r=ROUTES[name];const inD=dir??(p.y<CEN?1:-1);
  p.stop=!!r.stop;p.wi=0;p.route=r.w.map(([dx,dy])=>[Math.min(119.4,p.x+dx),clamp(p.y+dy*inD,1,FW-1)]);
  const pts=[[p.x,p.y],...p.route];const a=pts[pts.length-2],z=pts[pts.length-1];const ddx=z[0]-a[0],ddy=z[1]-a[1],d=hyp(ddx,ddy)||1;
  p.cont=p.stop?null:[clamp(z[0]+ddx/d*40,0,119.4),clamp(z[1]+ddy/d*40,.8,FW-.8)];p.rpath=pts;
}
function setupFormation(){
  const L=S.los,b=S.ballY,o=S.dc.o,d=S.dc.d;P=[];OFF=[];DEF=[];
  [-2.2,-1.1,0,1.1,2.2].forEach((dy,i)=>add('o','OL',L-.7,b+dy,o.OL[i]));
  const s=Math.random()<.5?-1:1;
  Q=add('o','QB',L-5,b,o.QB[0]);RB=add('o','RB',L-6.3,b-1.6*s,o.RB[0]);
  const te=add('o','TE',L-.9,b+3.6*s,o.TE[0]);
  const w1=add('o','WR',L-.7,clamp(b-19,3.5,FW-3.5),o.WR[0]),w2=add('o','WR',L-.7,clamp(b+19,3.5,FW-3.5),o.WR[1]),w3=add('o','WR',L-1.3,clamp(b-s*9.5,3,FW-3),o.WR[2]);
  setRoute(w1,pick(WRR));setRoute(w2,pick(WRR));setRoute(w3,pick(SLR));setRoute(te,pick(TER));setRoute(RB,pick(RBR),-s);
  [-3.2,-1.1,1.1,3.2].forEach((dy,i)=>add('d','DL',Math.min(119,L+1),b+dy,d.DL[i]));
  const l1=add('d','LB',Math.min(119,L+5),b+3.8*s,d.LB[0]),l2=add('d','LB',Math.min(119,L+5),b-3.8*s,d.LB[1]);l1.assign=te;l2.assign=RB;
  [w1,w2,w3].forEach((w,i)=>{const c=add('d','CB',Math.min(119,L+6.5),w.y,d.CB[i]);c.assign=w});
  add('d','S',Math.min(119,L+13),b-10,d.S[0]);add('d','S',Math.min(119,L+13),b+10,d.S[1]);
  ball={state:'held',x:L,y:b,z:0};
}
const teamStamina=()=>{const l=OFF.map(p=>stamina(p.pl,true)*condF(p.pl,true));return l.length?sum(l)/l.length:1};
const kicker=()=>S.dc.o.K[0];
const maxFG=()=>45+4*kicker().thr;
const fgDist=()=>Math.round(110-S.los+17);
const maxRange=()=>44+5*Q.pl.thr;

/* ---------- play calling ---------- */
function showCall(){
  const late=!S.ot&&S.q>=4&&S.clock<=120&&S.score[0]>S.score[1];
  let opts=[{k:'pass',t:'Pass',s:'Drag back to throw'},{k:'pa',t:'Play action',s:'Fake the run, then throw'},{k:'run',t:'Run',s:'Handoff to the back'},{k:'qbrun',t:'QB keeper',s:'Your quarterback runs it'}];
  if(S.conv)opts=opts.filter(o=>o.k!=='pa');
  if(late&&!S.conv)opts.push({k:'kneel',t:'Kneel',s:'Run clock · −1 yd',cls:'alt'});
  if(S.down===4&&!S.conv){
    if(!S.ot)opts.push({k:'punt',t:'Punt',s:'Flip the field',cls:'alt'},{k:'fakepunt',t:'Fake punt',s:'Catch them napping',cls:'warn'});
    const fd=fgDist();if(fd<=maxFG()+3)opts.push({k:'fg',t:'Field goal',s:fd+' yd attempt',cls:'alt'},{k:'fakefg',t:'Fake FG',s:'Surprise run',cls:'warn'});
  }
  $('#callHead').innerHTML=`<b>${esc(ddText())}</b> · ${S.conv?'from the 3':esc(spotLabel(S.los))} · QB ${esc(Q.pl.last)} ${'★'.repeat(Q.pl.thr)}${S.wx!=='Clear'?' · '+WX_ICON[S.wx]+' '+S.wx:''}`;
  const row=$('#callRow');row.innerHTML='';
  opts.forEach(o=>{const b=document.createElement('button');b.className='play '+(o.cls||'');b.id='call-'+o.k;b.innerHTML=`<b>${o.t}</b><small>${o.s}</small>`;b.onclick=()=>{ac();callPlay(o.k)};row.appendChild(b)});
  $('#call').hidden=false;
}
function showOpt(head,opts){
  $('#optHead').innerHTML=head;const row=$('#optRow');row.innerHTML='';
  opts.forEach(o=>{const b=document.createElement('button');b.className='play '+(o.cls||'');b.innerHTML=`<b>${o.t}</b><small>${o.s||''}</small>`;b.onclick=()=>{ac();$('#opt').hidden=true;o.f()};row.appendChild(b)});
  $('#opt').hidden=false;
}
function flagMsg(m){const f=$('#flag');f.textContent='🚩 '+m;f.classList.add('show');clearTimeout(flagMsg.t);flagMsg.t=setTimeout(()=>f.classList.remove('show'),2200);sfx('whistle')}
function callPlay(k){
  if(S.phase!=='presnap')return;$('#call').hidden=true;$('#toBtn').hidden=true;
  if(k==='punt')return doPunt();
  if(k==='fg')return startKick(fgDist(),'fg');
  const fsP=(S.userHome||S.neutral?.012:.05)*(hasTrait('dc','Disciplinarian')?.6:1)*(1.2-LG.morale/250);
  if(!S.conv&&k!=='kneel'&&Math.random()<fsP){flagMsg(`False start · offense · 5 yards${!S.userHome&&!S.neutral?' · crowd noise':''}`);S.los=Math.max(11,S.los-5);S.stats.pen++;S.stats.penYds+=5;setupFormation();showCall();S.playClock=25;return}
  const b=S.ballY,type=(k==='pass'||k==='pa')?'pass':'run';
  play={type,call:k,t:0,carrier:Q,thrown:false,scramble:false,handed:k==='qbrun',qbrun:k==='qbrun',pa:k==='pa',fake:k==='fakepunt'||k==='fakefg',jukeT:0,jukeCD:0,jukeDir:1,slowT:0,dive:0,hurdle:0,hurdleOK:false,ended:false,fakes:0,caught:false,catchX:0,gapY:b+pick([-3.3,-1.6,1.6,3.3]),result:null,ballT0:0,rec:null,contested:false,tipped:new Set(),startDown:S.down};
  if(k==='kneel'){S.phase='dead';deadT=.9;play.result={kind:'kneel',x:S.los-1,y:S.ballY};Q.fallen=true;sfx('whistle');return}
  OFF.forEach(p=>{if(p.role==='OL')p.blocker=true});
  if(type==='run'){OFF.forEach(p=>{if(p.role==='WR'||p.role==='TE'){p.route=null;p.blocker=true}});RB.route=null;if(play.qbrun)RB.blocker=true;if(!S.conv)S.stats.rushAtt++;if(!S.conv)ps(play.qbrun?Q:RB).ra++}
  if(play.fake){for(const d of DEF){if(d.role==='CB'||d.role==='S'){d.x=Math.min(119,d.x+8)}if(d.role==='LB')d.x=Math.min(119,d.x+3);d.react=.6}toast(k==='fakepunt'?'Fake punt!':'Fake field goal!')}
  S.phase='live';sfx('hike');if(!S.conv)S.stats.plays++;
  $('#bulletBtn').hidden=type!=='pass';
  hint(type==='pass'?'Drag back to aim · second finger or Bullet for a fast throw · tap to scramble':'Hold above/below to steer · flick up/down to juke · tap to hurdle · flick forward to dive');
}
function delayOfGame(){flagMsg('Delay of game · offense · 5 yards');S.los=Math.max(11,S.los-5);S.playClock=25;S.stats.pen++;setupFormation();showCall()}
$('#toBtn').onclick=()=>{const h=S.q<=2?0:1;if(S.phase!=='presnap'||S.to[h]<=0||S.lastRunoff<=0)return;S.clock=Math.min(S.qlen,S.clock+S.lastRunoff);S.lastRunoff=0;S.to[h]--;S.playClock=25;$('#toBtn').hidden=true;toast(`Timeout · ${S.to[h]} left`);sfx('whistle');snapshot()};
$('#bulletBtn').onclick=()=>{S.bullet=!S.bullet;$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet))};

/* ---------- kicking: tap for direction, tap for power ---------- */
function doPunt(){
  const k=kicker();let net=33+k.thr*2.4+R(-5,5)+(S.wx==='Wind'?R(-6,6):0);const land=S.los+net;
  sfx('thump');toast(`Punt · ${Math.round(net)} yds`);S.clock=Math.max(0,S.clock-6);S.phase='wait';
  setTimeout(()=>afterPossessionChange(land>=110?80:land-10,land>=110?'Punt · touchback':'Punt'),900);
}
function startKick(dist,kind){
  S.phase='kick';const k=kicker();
  kick={dist,kind,stage:'aim',t:0,ang:0,pow:0,lockA:0,lockP:0,flight:0,good:null,
    width:clamp(.34-(dist-20)*.0055,.09,.34)*(.8+.1*k.acc)*(kind==='xp'?1.25:1),
    need:clamp(dist/maxFG(),.22,1.02)*(S.wx==='Rain'||S.wx==='Snow'?1.05:1),drift:S.wx==='Wind'?R(-.12,.12):0,aSpeed:1.3+dist*.018,k};
  $('#kickHead').innerHTML=`<b>${kind==='xp'?'Extra point':'Field goal'} · ${dist} yd</b> · K ${esc(k.last)} ${'★'.repeat(k.thr)}${S.wx==='Wind'?' · wind':''}`;
  $('#kickBtn').textContent='Tap to aim';$('#kickBtn').disabled=false;$('#kick').hidden=false;hint('Tap once to lock direction, again to lock power');
}
function kickTap(){
  if(!kick)return;
  if(kick.stage==='aim'){kick.lockA=kick.ang;kick.stage='power';kick.t=0;$('#kickBtn').textContent='Tap for power';return}
  if(kick.stage==='power'){kick.lockP=kick.pow;kick.stage='flight';kick.flight=0;const a=kick.lockA+kick.drift;kick.aimF=a;kick.good=Math.abs(a)<kick.width&&kick.lockP>=kick.need;$('#kickBtn').disabled=true;sfx('thump');
  }
}
function updateKick(dt){
  if(!kick)return;kick.t+=dt;
  if(kick.stage==='aim')kick.ang=Math.sin(kick.t*kick.aSpeed);
  if(kick.stage==='power'){const p=(kick.t*1.15)%2;kick.pow=p<1?p:2-p}
  if(kick.stage==='flight'){kick.flight+=dt;if(kick.flight>=1.05&&!kick.done){kick.done=true;finishKick()}}
}
function finishKick(){
  const k=kick,good=k.good;
  setTimeout(()=>{
    $('#kick').hidden=true;hint('');
    if(good){banner("It's good",S.home.c1);sfx('roar');S.score[0]+=k.kind==='xp'?1:3}else{banner('No good','#5B6672');sfx('groan')}
    kick=null;if(k.kind==='fg'&&!S.ot)S.clock=Math.max(0,S.clock-5);
    setTimeout(()=>{if(k.kind==='xp'){if(S.ot)return oppOT();return afterScoreKickoff()}if(good){if(S.ot)return oppOT();return afterScoreKickoff()}afterPossessionChange(Math.min(S.los-17,80),'Missed field goal')},1300);
  },250);
}
$('#kickBtn').onclick=()=>{ac();kickTap()};
function showPAT(){
  const two=S.ot&&S.otRound>=2;S.phase='pat';snapshot(true);
  showOpt(two?'<b>Overtime rule:</b> you must go for two':'Point after touchdown',[...(two?[]:[{t:'Extra point',s:'Kick · 33 yd',f:()=>startKick(33,'xp')}]),{t:'Go for two',s:'One play from the 3',cls:'alt',f:()=>{S.conv=true;S.los=107;S.ballY=CEN;S.down=1;S.firstDownX=110;toPresnap()}}]);
}
function afterScoreKickoff(){
  S.phase='wait';
  showOpt('Kickoff',[{t:'Kick deep',s:'Touchback at their 25',f:()=>afterPossessionChange(75,'Kickoff')},{t:'Onside kick',s:'Risky · about 1 in 7',cls:'warn',f:()=>{
    const ok=Math.random()<.13+(S.q>=4&&S.score[0]<S.score[1]?.05:0);S.clock=Math.max(0,S.clock-3);
    if(ok){banner('Onside recovered!',S.home.c1);sfx('roar');setTimeout(()=>startDrive(R(55,58)),900)}else{toast('They recover the onside kick');afterPossessionChange(R(43,47),'Onside kick')}}}]);
}

/* ---------- simulation ---------- */
function steer(p,tx,ty,spd,dt,acc){const ddx=tx-p.x,ddy=ty-p.y,d=hyp(ddx,ddy);let vx=0,vy=0;if(d>.05){const s=spd*Math.min(1,d/1.1);vx=ddx/d*s;vy=ddy/d*s}const k=Math.min(1,(acc||p.acc)*dt);p.vx+=(vx-p.vx)*k;p.vy+=(vy-p.vy)*k}
const eligible=p=>p.side==='o'&&(p.role==='WR'||p.role==='TE'||p.role==='RB');
function isRunner(){if(!play||!play.carrier||play.carrier.side!=='o')return false;const c=play.carrier;if(c===Q)return play.scramble;return play.type==='pass'?play.caught:play.handed}
function runRoute(p,dt){let t=p.wi<p.route.length?p.route[p.wi]:p.cont;if(p.wi<p.route.length&&hyp(t[0]-p.x,t[1]-p.y)<.9){p.wi++;t=p.wi<p.route.length?p.route[p.wi]:p.cont}if(t)steer(p,t[0],t[1],p.spd,dt);else steer(p,p.x,p.y,0,dt)}
function nearest(list,x,y,f){let b=null,bd=1e9;for(const o of list){if(f&&!f(o))continue;const d=hyp(o.x-x,o.y-y);if(d<bd){bd=d;b=o}}return [b,bd]}
function blockAI(p,dt){
  const pre=play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q;
  if(p.role==='OL'&&pre){const [dl]=nearest(DEF,p.x,p.y,d=>d.role==='DL');if(dl){const ddx=Q.x-dl.x,ddy=Q.y-dl.y,d=hyp(ddx,ddy)||1;steer(p,dl.x+ddx/d,dl.y+ddy/d,5.2,dt)}return}
  const c=play.carrier||Q;
  if(play.type==='run'&&(p.role==='OL'||p.role==='TE'||(p===RB&&play.qbrun))&&c.x<S.los+1.5){const gx=S.los,gy=play.gapY;const [d]=nearest(DEF,p.x,p.y,o=>!o.immune&&(o.role==='DL'||o.role==='LB'));if(d){const ddx=gx-d.x,ddy=gy-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n*.9,d.y+ddy/n*.9,p.spd,dt);return}}
  const [d]=nearest(DEF,p.x,p.y,o=>!o.immune&&o.stun<=0&&hyp(o.x-c.x,o.y-c.y)<14);
  if(d){const ddx=c.x-d.x,ddy=c.y-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n*.9,d.y+ddy/n*.9,p.spd*.95,dt)}else steer(p,c.x+4,c.y+(p.homeY>c.y?3:-3),p.spd*.8,dt);
}
function controlRunner(c,dt){
  let spd=c.spd*(play.jukeT>0?1.1:1)*(play.slowT>0?.6:1)*(play.dive>0?1.3:1);let vy=0;
  if(touch&&touch.mode==='steer'&&performance.now()-touch.t0>110){const off=touch.y-Y(c.y);if(Math.abs(off)>10)vy=clamp(off/(scE()*VY*2.2),-1,1)*spd*.85}
  if(play.jukeT>0)vy=play.jukeDir*spd*.95;
  if(play.dive>0)vy*=.3;
  const vx=Math.sqrt(Math.max(0,spd*spd-vy*vy));const k=Math.min(1,(play.jukeT>0?18:10)*dt);c.vx+=(vx-c.vx)*k;c.vy+=(vy-c.vy)*k;
  if(play.hurdle>0){play.hurdle-=dt;const t=1-play.hurdle/.5;c.z=Math.max(0,Math.sin(t*Math.PI)*.95)}else if(play.dive<=0)c.z=0;
  if(play.dive>0){play.dive-=dt;c.z=Math.max(0,Math.sin((1-play.dive/.38)*Math.PI)*.35);if(play.dive<=0){c.z=0;c.fallen=true;spawnTurf(c.x,c.y,8);endPlay('tackle','Dive')}}
  c.stiff=Math.max(0,c.stiff-dt);
}
function defAI(d,dt){
  d.lungeCD-=dt;
  if(d.stun>0){d.stun-=dt;steer(d,d.x,d.y,0,dt,3);if(d.stun<=0)d.fallen=false;return}
  let spd=d.spd;d.engaged=false;
  if(d.react>0&&play.t<d.react)spd*=.3;
  if(!d.immune){for(const o of OFF){if(o.blocker&&o!==play.carrier&&hyp(o.x-d.x,o.y-d.y)<1.25){d.bt+=dt;if(d.bt>d.shed*(o.pl.str>=4?1.2:1))d.immune=true;spd*=d.role==='DL'?.18:.3;d.engaged=true;o.engaged=true;const ex=d.x-o.x,ey=d.y-o.y,n=hyp(ex,ey)||1;d.vx+=ex/n*12*dt;d.vy+=ey/n*12*dt;break}}}
  const L=S.los,c=play.carrier;let tx,ty;const runner=isRunner();
  if(d.lunge>0){d.lunge-=dt;steer(d,d.lx,d.ly,d.spd*1.6,dt,16);if(d.lunge<=0&&!play.ended){d.stun=.85;d.fallen=true;spawnTurf(d.x,d.y,5)}return}
  if(ball.state==='air'){const rem=ball.T-ball.t,dd=hyp(ball.tx-d.x,ball.ty-d.y);if(play.t-play.ballT0>.2&&dd/d.spd<rem+.9){tx=ball.tx;ty=ball.ty}}
  if(tx===undefined){
    let pursue=runner;
    if(play.type==='run'&&!play.qbrun){pursue=play.t>{DL:0,LB:.3,CB:.7,S:.9}[d.role]}
    if(play.qbrun)pursue=play.t>{DL:0,LB:.35,CB:.6,S:.8}[d.role];
    if(play.scramble&&!play.qbrun&&play.t-play.scrT<.3&&d.role!=='DL')pursue=false;
    if(pursue&&c){
      const n=hyp(c.x-d.x,c.y-d.y),lead=Math.min(.7,n/d.spd*.5);tx=c.x+c.vx*lead;ty=c.y+c.vy*lead;
      if(runner&&n<2.1&&n>1&&d.lungeCD<=0&&!d.engaged){d.lunge=.3;d.lungeCD=1.6;d.lx=c.x+c.vx*.28;d.ly=c.y+c.vy*.28}
    }
    else if(d.role==='DL'){tx=(c||Q).x;ty=(c||Q).y}
    else if(play.pa&&play.t<.65&&(d.role==='LB'||d.role==='S')){tx=L+1.5;ty=d.y}
    else if(d.role==='CB'){const a=d.assign,cush=Math.max(.6,3.2-play.t*1.3);tx=a.x+a.vx*.3+cush;ty=a.y+a.vy*.3}
    else if(d.role==='LB'){const a=d.assign;if(a&&a.x>L+.5&&hyp(a.x-d.x,a.y-d.y)<9){tx=a.x+a.vx*.3+.8;ty=a.y+a.vy*.3}else{tx=L+5.5;ty=d.homeY}}
    else{const top=d.homeY<CEN;let rx=L,ry=d.homeY;for(const o of OFF)if(eligible(o)&&(o.y<CEN)===top&&o.x>rx){rx=o.x;ry=o.y}tx=Math.min(119,Math.max(L+11,rx+3.5));ty=(d.homeY+ry)/2}
  }
  steer(d,tx,ty,spd,dt);
}
function simulate(dt){
  for(const p of P){p.fallP=lerp(p.fallP,p.fallen?1:0,Math.min(1,dt*9));const sp=hyp(p.vx,p.vy);p.phase+=sp*dt*1.85;p.throwT=Math.max(0,p.throwT-dt)}
  if(S.phase==='dead'){for(const p of P){steer(p,p.x,p.y,0,dt,4);p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.z>0&&p!==S.celebrate)p.z=Math.max(0,p.z-dt*3)}if(S.celebrate){const c=S.celebrate;c.z=Math.abs(Math.sin(performance.now()/160))*.5}return}
  const pl=play;pl.t+=dt;pl.jukeT=Math.max(0,pl.jukeT-dt);pl.jukeCD-=dt;pl.slowT-=dt;
  const L=S.los,b=S.ballY;
  if(pl.qbrun&&!pl.scramble&&pl.t>.25){pl.scramble=true;pl.scrT=pl.t}
  if(pl.type==='run'&&!pl.qbrun&&!pl.handed&&(hyp(Q.x-RB.x,Q.y-RB.y)<1.3||pl.t>.8)){pl.handed=true;pl.carrier=RB}
  const runner=isRunner();
  for(const p of OFF){
    p.engaged=false;
    if(p===pl.carrier&&runner){controlRunner(p,dt);continue}
    if(p.role==='QB'){
      if(pl.type==='pass'&&!pl.thrown&&p===pl.carrier)steer(p,L-7.5,b,pl.pa&&pl.t<.55?3.2:5.5,dt);
      else if(pl.type==='run'&&!pl.handed)steer(p,L-3.6,(b+RB.y)/2,5,dt);
      else steer(p,p.x,p.y,0,dt);continue;
    }
    if(p===RB&&pl.type==='run'&&!pl.handed&&!pl.qbrun){steer(p,L-1.5,pl.gapY,6.5,dt);continue}
    if(p===RB&&pl.pa&&pl.t<.5){steer(p,L-3,b,5,dt);continue}
    if(p.blocker)blockAI(p,dt);else if(p.route&&(p!==RB||pl.t>.45))runRoute(p,dt);else steer(p,p.x,p.y,0,dt);
    if(ball.state==='air'&&eligible(p)&&ball.t/ball.T>.45&&hyp(p.x-ball.tx,p.y-ball.ty)<4.5)steer(p,ball.tx,ball.ty,p.spd,dt,12);
  }
  for(const d of DEF)defAI(d,dt);
  for(const p of P){p.x+=p.vx*dt;p.y+=p.vy*dt}
  const hold=pl.carrier;
  for(let i=0;i<P.length;i++){const a=P[i];if(a===hold)continue;for(let j=i+1;j<P.length;j++){const c=P[j];if(c===hold)continue;const ddx=c.x-a.x,ddy=c.y-a.y,d=hyp(ddx,ddy);if(d<.95&&d>1e-4){const o=(.95-d)/2;a.x-=ddx/d*o;a.y-=ddy/d*o;c.x+=ddx/d*o;c.y+=ddy/d*o}}}
  const c=pl.carrier;
  if(c&&!pl.ended){
    if(runner||(pl.type==='run'&&!pl.handed)){
      if(c.x>=110&&runner)return endPlay('td');
      if(c.y<0||c.y>FW)return endPlay('oob');
      if(c.x<=10&&runner&&c.vx<0){}
      tackleCheck(c);
    }else if(c===Q&&pl.type==='pass'&&!pl.thrown){
      for(const d of DEF){if(d.stun<=0&&hyp(d.x-Q.x,d.y-Q.y)<.9){if(Math.random()<.03+Q.pl.spd*.012){d.stun=.7;d.fallen=true;toast('Escaped')}else{Q.fallen=true;d.fallen=true;S.shake=.35;spawnTurf(Q.x,Q.y,10);return endPlay('sack')}}}
    }
  }
  if(ball.state==='held'){const h=pl.carrier||Q;ball.x=h.x;ball.y=h.y;ball.z=0}
  else if(ball.state==='air'){
    ball.t+=dt;const p=Math.min(1,ball.t/ball.T);ball.x=lerp(ball.fx,ball.tx,p);ball.y=lerp(ball.fy,ball.ty,p);ball.z=4*ball.h*p*(1-p);ball.spin+=dt*20;
    if(ball.bullet&&p>.12&&p<.86&&ball.z<1.5){for(const d of DEF){if(pl.tipped.has(d)||d.stun>0)continue;if(hyp(d.x-ball.x,d.y-ball.y)<.8){pl.tipped.add(d);if(Math.random()<.32+(d.pl.cat-3)*.06){if(Math.random()<.3){logPass('I');pl.carrier=d;dx(d.pl,'dint',1);return endPlay('int')}logPass('X');return endPlay('inc','Tipped at the line')}}}}
    if(p>=1)resolveCatch();
  }
}
function tackleCheck(c){
  for(const d of DEF){
    if(d.stun>0)continue;const reach=d.lunge>0?1.2:.95;if(hyp(d.x-c.x,d.y-c.y)>=reach)continue;
    if(d.engaged){if(d.armTried)continue;d.armTried=true;if(Math.random()>.3)continue}
    if(play.hurdle>0&&c.z>.25){if(play.hurdleOK){d.stun=1;d.fallen=true;if(++play.fakes===1)toast('Hurdle!');continue}else{c.fallen=true;return tackled(c,d)}}
    if(play.jukeT>0){d.stun=1;d.fallen=true;if(++play.fakes===1)toast('Juke!');continue}
    const gang=DEF.some(o=>o!==d&&o.stun<=0&&hyp(o.x-c.x,o.y-c.y)<1.3);
    let ch=.05+(c.pl.str-d.pl.tkl)*.07+(c.role==='RB'?.05:0)+(focus('running')?.05:0);if(gang)ch*=.4;ch=clamp(ch,.02,.45);
    if(Math.random()<ch){d.stun=1;d.fallen=true;c.stiff=.45;play.slowT=.3;toast('Stiff arm!');S.shake=.22;spawnTurf(d.x,d.y,6);continue}
    return tackled(c,d);
  }
}
function tackled(c,d){c.fallen=true;d.fallen=true;S.shake=.12+d.pl.str*.05;spawnTurf(c.x,c.y,10);dx(d.pl,'tkl',1);dx(d.pl,'xp',3);if(d.pl.str>=4&&hyp(c.vx,c.vy)>6){slowMo(.35);toast('Big hit!')}endPlay('tackle')}
function throwBall(tx,ty,bullet){
  const d=hyp(tx-Q.x,ty-Q.y),thr=Q.pl.thr,acc=Q.pl.acc;
  const pressure=DEF.some(o=>o.role==='DL'&&hyp(o.x-Q.x,o.y-Q.y)<2.2);
  const wx=S.wx==='Rain'?1.2:S.wx==='Snow'?1.15:S.wx==='Wind'&&d>20?1.3:1;
  const er=d*(.012*(6-acc))*(bullet?1.25:1)*(pressure?1.35:1)*wx*(focus('passing')?.8:1);
  const a=Math.random()*Math.PI*2,r=er*Math.sqrt(Math.random());tx+=Math.cos(a)*r;ty+=Math.sin(a)*r;
  const v=(17.5+1.8*thr)*(bullet?1.45:1);
  ball={state:'air',fx:Q.x,fy:Q.y,x:Q.x,y:Q.y,z:0,tx,ty,t:0,T:Math.max(.3,d/(v+d*.18)),h:bullet?d*.03+.45:d*.11+.5,bullet,spin:0};
  play.thrown=true;play.ballT0=play.t;play.carrier=null;Q.throwT=.35;if(!S.conv){S.stats.att++;ps(Q).pa++}sfx(bullet?'zip':'thump');hint('');$('#bulletBtn').hidden=true;
}
function aimError(d,bullet){const pressure=DEF.some(o=>o.role==='DL'&&hyp(o.x-Q.x,o.y-Q.y)<2.2);const wx=S.wx==='Rain'?1.2:S.wx==='Snow'?1.15:S.wx==='Wind'&&d>20?1.3:1;return d*(.012*(6-Q.pl.acc))*(bullet?1.25:1)*(pressure?1.35:1)*wx*(focus('passing')?.8:1)}
function logPass(res){if(S.conv)return null;const r={depth:ball.tx-S.los,y:ball.ty,res,yds:0,yac:0};S.stats.passes.push(r);return r}
function resolveCatch(){
  const tx=ball.tx,ty=ball.ty;
  const [rec,dr]=nearest(OFF,tx,ty,eligible),[df,dd]=nearest(DEF,tx,ty,d=>d.stun<=0);
  const inb=ty>=0&&ty<=FW&&tx<=120;const cr=rec?1.3+rec.pl.cat*.12:0;
  play.passDepth=tx-S.los;
  if(rec&&dr<cr&&inb){
    const contested=dd<1.7;play.contested=contested;
    const ballSk=df?(df.pl.cat+df.pl.spd)/2:3;
    if(contested&&dd<dr&&Math.random()<.2+(ballSk-3)*.05){logPass('I');play.carrier=df;dx(df.pl,'dint',1);dx(df.pl,'xp',25);return endPlay('int')}
    const cat=rec.pl.cat,wxC=S.wx==='Rain'?-.06:S.wx==='Snow'?-.04:0;
    const pc=(contested?clamp(.22+dd*.18+(cat-3)*.07,.18,.75):.78+.04*cat)+wxC+(focus('passing')?.03:0)-(ball.bullet&&cat<4?.06:0);
    if(Math.random()<pc){
      ball.state='held';play.carrier=rec;play.caught=true;rec.route=null;if(!S.conv){S.stats.comp++;ps(Q).pc++;ps(rec).rec++}
      play.rec=logPass('C');
      OFF.forEach(o=>{if(o!==rec&&o!==Q)o.blocker=true});
      if(dr>.3){rec.x=lerp(rec.x,tx,.6);rec.y=lerp(rec.y,ty,.6)}
      play.catchX=rec.x;if(contested){toast('Contested catch!');slowMo(.3)}
      hint('Hold above/below to steer · flick to juke · tap to hurdle · flick forward to dive');return;
    }
    logPass('X');if(contested&&df)dx(df.pl,'xp',6);return endPlay('inc',contested?'Broken up':'Dropped');
  }
  if(df&&dd<1.3&&inb&&Math.random()<.35+((df.pl.cat+df.pl.spd)/2-3)*.06){logPass('I');play.carrier=df;dx(df.pl,'dint',1);dx(df.pl,'xp',25);return endPlay('int')}
  logPass('X');endPlay('inc',df&&dd<1.7?'Pass defended':'Incomplete');
}
function endPlay(kind,msg){
  if(play.ended)return;play.ended=true;S.phase='dead';hint('');touch=null;aim=null;$('#bulletBtn').hidden=true;
  deadT=kind==='td'?2.4:kind==='int'?1.9:1.3;
  const c=play.carrier||Q;let x=kind==='inc'?S.los:kind==='td'?110:c.x;
  if(kind!=='td'&&kind!=='inc'&&kind!=='int')x=Math.min(x,109.9);
  play.result={kind,x,y:c.y};
  const gain=Math.round(x-S.los);
  if(kind==='td'){banner(S.conv?'Two-point good':'Touchdown',S.home.c1);sfx('roar');sfx('fight');S.celebrate=c;spawnConfetti(c.x,c.y);slowMo(.5)}
  else if(kind==='int'){banner('Intercepted',S.away.c1);sfx('groan');sfx('whistle');slowMo(.4)}
  else{sfx('whistle');if(kind==='inc')toast(msg||'Incomplete');else if(kind==='sack')toast(`Sacked · ${gain} yds`);else toast(`${msg?msg+' · ':''}${gain>=0?'+':''}${gain} yds${kind==='oob'?' · out of bounds':''}`)}
  if(!S.conv){
    const st=S.stats;
    if(kind==='tackle'||kind==='oob'||kind==='td'){
      if(play.caught){st.passYds+=gain;const yac=Math.max(0,Math.round(x-play.catchX));st.yac+=yac;if(play.rec){play.rec.yds=gain;play.rec.yac=yac}ps(Q).py+=gain;ps(c).recy+=gain;if(kind==='td'){st.passTD++;ps(Q).ptd++;ps(c).rectd++}}
      else{st.rushYds+=gain;if(play.scramble&&!play.qbrun){st.rushAtt++;ps(c).ra++}ps(c).ry+=gain;if(kind==='td'){st.rushTD++;ps(c).rtd++}}
    }
    if(kind==='sack')st.sacks++;if(kind==='int'){st.int++;ps(Q).int++}
  }
}
function rollPenalty(r){
  if(r.kind==='kneel'||r.kind==='sack')return null;const disc=hasTrait('dc','Disciplinarian')?.7:1;
  if((r.kind==='tackle'||r.kind==='oob'||r.kind==='td')&&r.x-S.los>3&&Math.random()<.035*disc)return {name:'Holding · offense · 10 yards, replay the down',type:'hold'};
  if(r.kind==='inc'&&play.contested&&play.passDepth>8&&Math.random()<.3)return {name:'Pass interference · defense · automatic first down',type:'dpi'};
  if(play.thrown&&Math.random()<.012)return {name:'Roughing the passer · 15 yards · automatic first down',type:'add15'};
  if(r.kind==='tackle'&&Math.random()<.012)return {name:'Face mask · defense · 15 yards',type:'add15'};
  if(Math.random()<.018&&!(r.kind!=='inc'&&r.x-S.los>=5))return {name:'Offside · defense · 5 yards, replay the down',type:'off5'};
  return null;
}
function applyResult(){
  const r=play.result,dur=play.t;
  if(S.conv){if(r.kind==='td')S.score[0]+=2;else toast('Conversion failed');S.conv=false;if(S.ot)return oppOT();return afterScoreKickoff()}
  const runoff=r.kind==='kneel'?40:(r.kind==='tackle'||r.kind==='sack')?18:0;
  const pen=rollPenalty(r);
  if(pen){
    flagMsg(pen.name);S.stats.pen++;
    if(pen.type==='hold'){if(!S.ot)S.clock=Math.max(0,S.clock-dur);S.lastRunoff=0;S.los=Math.max(11,S.los-10);S.stats.penYds+=10;return nextSnap()}
    if(pen.type==='dpi'){if(!S.ot)S.clock=Math.max(0,S.clock-dur);S.lastRunoff=0;S.los=Math.min(109,Math.max(S.los+1,Math.min(S.los+15,Math.round(ball.tx))));S.down=1;S.firstDownX=Math.min(110,S.los+10);return nextSnap()}
    if(pen.type==='off5'){if(!S.ot)S.clock=Math.max(0,S.clock-dur);S.lastRunoff=0;S.los=Math.min(109,S.los+5);return nextSnap()}
  }
  if(!S.ot){S.clock=Math.max(0,S.clock-(dur+runoff));S.lastRunoff=runoff}
  const wasThird=S.down===3&&r.kind!=='kneel';if(wasThird)S.stats.thirdA++;
  if(r.kind==='td'){if(wasThird)S.stats.thirdC++;if(S.rzActive)S.stats.rzTD++;S.score[0]+=6;S.phase='pat';hint('');return showPAT()}
  if(r.kind==='int'){const pick6=false;S.rzActive=false;return afterPossessionChange(Math.max(5,r.x-10),'Interception')}
  let nx=r.kind==='inc'?S.los:r.x;
  if(pen&&pen.type==='add15'){nx=Math.min(109,nx+15);S.down=3;S.firstDownX=nx}
  if(r.kind!=='inc')S.ballY=clamp(r.y,HASH1,HASH2);
  if(nx<=10){S.score[1]+=2;banner('Safety',S.away.c1);return afterPossessionChange(60,'Safety')}
  if(nx>=S.firstDownX){if(wasThird)S.stats.thirdC++;S.los=nx;S.down=1;S.firstDownX=Math.min(110,nx+10);S.stats.firstDowns++;if(!pen)toast('First down');if(!S.ot&&S.clock>0){const back=Math.min(runoff,12);S.clock=Math.min(S.qlen,S.clock+back);S.lastRunoff=Math.max(0,runoff-back)}return nextSnap()}
  if(S.down===4){banner('Turnover on downs','#5B6672');S.rzActive=false;return afterPossessionChange(nx-10,'Turnover on downs')}
  S.down++;S.los=nx;nextSnap();
}
function nextSnap(){
  if(!S.ot&&S.clock<=0){
    if(S.q===1||S.q===3){toast(`End of ${qName(S.q)} quarter`);S.q++;S.clock=S.qlen;S.lastRunoff=0;return toPresnap()}
    if(S.q===2){S.q=3;S.clock=S.qlen;S.to=[3,3];S.lastRunoff=0;return oppDrive(75,'Halftime · they receive')}
    return endRegulation();
  }
  toPresnap();
}
function afterPossessionChange(dist,why){
  S.phase='wait';S.rzActive=false;S.lastRunoff=0;
  if(S.ot)return oppOT();
  if(S.clock<=0){
    if(S.q===2){S.q=3;S.clock=S.qlen;S.to=[3,3];return oppDrive(75,'Halftime · they receive')}
    if(S.q>=4)return endRegulation();
    S.q++;S.clock=S.qlen;
  }
  oppDrive(dist,why);
}
function endRegulation(){
  if(S.score[0]===S.score[1]){
    S.ot=true;S.otRound=1;S.q=5;S.clock=0;
    showTicker({eye:'End of regulation',team:S.home,lines:[{dd:'Overtime',t:'College rules: each team gets a possession from the 25. From the second overtime you must go for two after a touchdown. From the third, it’s alternating two-point plays.'}],res:'Overtime',good:true,chips:[['Ball','You go first']],btn:'Take the field',next:startOT});return;
  }
  gameOver();
}
function startOT(){
  if(S.otRound>=3){S.conv=true;S.los=107;S.ballY=CEN;S.down=1;S.firstDownX=110;toPresnap();banner(S.otRound+'OT · two-point play',S.home.c1);return}
  S.los=85;S.ballY=CEN;S.down=1;S.firstDownX=95;S.conv=false;toPresnap();banner((S.otRound>1?S.otRound:'')+'OT',S.home.c1);
}
function oppRating(){return clamp(.5+(offOvr(S.away)-defOvr(S.home))*.22+(S.diffMul-1)*2-(LG.staff.dc.r-3)*.03-(hasTrait('dc','Run Stopper')?.04:0)-(focus('film')?.04:0),.1,.92)}
function oppOT(){
  S.phase='drive';S.poss='away';hint('');
  const r=oppRating();let res,pts=0;const lines=[];const A=S.away,aq=starters(A,'QB')[0],ar=starters(A,'RB')[0],aw=starters(A,'WR')[0];
  if(S.otRound>=3){const ok=Math.random()<.36+.25*r;pts=ok?2:0;res=ok?'Two-point good':'Two-point stopped';lines.push({dd:'2-pt try',t:ok?`${aq.last} finds ${aw.last} in the end zone.`:`${aq.last}'s pass falls incomplete.`,cls:ok?'bad big':'good big'})}
  else{const roll=Math.random();
    if(roll<.3+.3*r){const two=S.otRound>=2;const ok2=Math.random()<.45;pts=6+(two?(ok2?2:0):1);res='Touchdown';lines.push({dd:'1st & 10 · '+S.away.abbr+' 25',t:`${ar.last} runs for ${rint(4,9)}.`},{dd:'2nd & 3',t:`${aq.last} to ${aw.last}, touchdown!`,cls:'bad big'},{dd:'Try',t:two?(ok2?'Two-point conversion is good.':'Two-point try fails!'):'Extra point is good.'})}
    else if(roll<.55+.3*r){pts=3;res='Field goal';lines.push({dd:'1st & 10',t:`${ar.last} gains ${rint(2,6)}.`},{dd:'3rd & 6',t:`${aq.last} incomplete.`},{dd:'4th & 6',t:`Field goal from ${rint(33,42)} yards is good.`,cls:'bad'})}
    else{res=pick(['Stopped on downs','Missed field goal','Interception']);const db=pick(starters(S.home,'CB'));if(res==='Interception'){dx(db,'dint',1);dx(db,'xp',25)}lines.push({dd:'1st & 10',t:`${ar.last} stuffed for no gain.`,cls:'good'},{dd:'3rd & 10',t:res==='Interception'?`INTERCEPTED by #${db.num} ${db.last}!`:`${aq.last} sacked!`,cls:'good big'})}}
  S.score[1]+=pts;if(pts)sfx('groan');
  const done=S.score[0]!==S.score[1];
  showTicker({eye:`${S.otRound>1?S.otRound:''}OT · ${S.away.city} possession`,team:S.away,lines,res,good:!pts,chips:[['From',S.otRound>=3?'the 3':S.away.abbr+' 25']],from:S.otRound>=3?3:25,to:pts>=6?0:pts===2?0:pts===3?8:20,btn:done?'Final':'Next overtime',next:()=>{if(done)gameOver();else{S.otRound++;startOT()}}});
}
/* opponent possessions are simulated and told as a play-by-play ticker */
function oppDrive(startDist,why){
  S.phase='drive';S.poss='away';hint('');
  const d=clamp(startDist,1,99),r=oppRating(),close=1-d/100;
  const pTD=.08+.44*r*close+(d<20?.18:0),pFG=.16+.15*close,pTO=.15-.06*r+(hasTrait('dc','Ball Hawk')?.05:0);
  const roll=Math.random();let res=roll<pTD?'TD':roll<pTD+pFG?'FG':roll<pTD+pFG+pTO?'TO':'PUNT';
  if(res==='PUNT'&&d<33)res='FG';
  let time=R(45,130)*(S.qlen/180);time=Math.min(time,S.clock+S.qlen-10);
  let endsHalf=false;
  if(time>=S.clock&&(S.q===2||S.q>=4)){time=S.clock;endsHalf=true;if(res!=='TD'||Math.random()<.5)res=(d<45&&Math.random()<.6)?'FG':'CLOCK'}
  S.clock-=time;if(!endsHalf&&S.clock<=0&&(S.q===1||S.q===3)){S.q++;S.clock+=S.qlen}if(endsHalf)S.clock=0;
  let yds,ourX,label,defTD=false;
  if(res==='TD'){yds=d;S.score[1]+=7;label='Touchdown';ourX=35}
  else if(res==='FG'){yds=Math.round(clamp(d-R(12,30),0,d));S.score[1]+=3;label='Field goal';ourX=35}
  else if(res==='TO'){yds=Math.round(R(0,d*.5));label=pick(['Interception','Fumble recovered']);ourX=10+(d-yds);if(Math.random()<.16){defTD=true;S.score[0]+=7;label=label==='Interception'?'Pick six!':'Scoop and score!'}}
  else if(res==='PUNT'){yds=Math.round(R(4,Math.max(5,Math.min(30,d-35))));const spot=d-yds-40;label='Punt';ourX=spot<=0?30:10+Math.max(3,spot)}
  else{yds=Math.round(R(5,Math.min(25,d)));label=S.q>=4?'Clock runs out':'End of half'}
  if(res==='TD'||res==='FG')sfx('groan');
  const plays=Math.max(3,Math.round(time/(25*S.qlen/180)));
  const lines=driveLines(d,res,yds,plays,label,defTD);
  showTicker({eye:`${S.away.city} possession${why?' · '+why:''}`,team:S.away,lines,res:label,good:res==='TO'||res==='PUNT'||res==='CLOCK',
    chips:[['Plays',plays],['Yards',yds],['Time',fmtClock(time)],['Started',spotLabel(10+d)]],from:d,to:d-yds,
    btn:endsHalf?(S.q>=4?'Final whistle':'Second half'):defTD?'Kick off':'Take the field',
    next:()=>{if(endsHalf){if(S.q===2){S.q=3;S.clock=S.qlen;S.to=[3,3];return oppDrive(75,'Second half kickoff')}return endRegulation()}if(defTD)return afterScoreKickoff();startDrive(clamp(ourX,11,95))}});
}
function driveLines(d,res,yds,plays,label,defTD){
  const A=S.away,H=S.home,aq=starters(A,'QB')[0],ar=starters(A,'RB')[0],rcv=[...starters(A,'WR'),...starters(A,'TE')];
  const myD=[...starters(H,'DL'),...starters(H,'LB'),...starters(H,'CB'),...starters(H,'S')];const dl=starters(H,'DL'),db=[...starters(H,'CB'),...starters(H,'S')],lb=starters(H,'LB');
  const nm=p=>`#${p.num} ${p.last}`;
  const out=[];let spot=d,down=1,togo=Math.min(10,d);
  const n=Math.max(1,plays-1);let finalGain=res==='TD'?Math.min(d,rint(1,Math.min(30,d))):0;let pool=Math.max(0,res==='TD'?d-finalGain:yds);
  const w=Array.from({length:n},()=>Math.random()**1.5+.05),sw=sum(w);const gains=w.map(x=>Math.round(pool*x/sw));gains[0]+=pool-sum(gains);
  for(let i=0;i<n-1;i++)if(Math.random()<.14){const k=rint(3,8);gains[i]-=k;gains[i+1]+=k}
  for(const g of gains){
    let t,cls='';const tk=pick(myD);
    if(g<0&&Math.random()<.7){const s=pick(dl);t=`SACK! ${nm(s)} drops ${aq.last} for a loss of ${-g}.`;cls='good';dx(s,'sck',1);dx(s,'xp',15)}
    else if(g<=0){if(Math.random()<.55){const c=pick(db);t=`${aq.last}'s pass is broken up by ${nm(c)}.`;cls='good';dx(c,'xp',5)}else{const s=pick([...dl,...lb]);t=`${ar.last} stuffed by ${nm(s)}${g<0?' for a loss of '+(-g):''}.`;cls='good';dx(s,'tkl',1);dx(s,'xp',4)}}
    else if(Math.random()<.55){const rc=pick(rcv);t=`${aq.last} to ${rc.last} for ${g}. ${g>=20?'Big play.':''} Tackle by ${nm(tk)}.`;if(g>=20)cls='bad';dx(tk,'tkl',1);dx(tk,'xp',3)}
    else{t=`${ar.last} runs for ${g}. Tackle by ${nm(tk)}.`;if(g>=15)cls='bad';dx(tk,'tkl',1);dx(tk,'xp',3)}
    out.push({dd:`${ord(down)} & ${togo>=spot?'Goal':Math.max(1,Math.round(togo))} · ${spotLabel(10+spot)}`,t,cls});
    spot-=g;togo-=g;if(togo<=0){down=1;togo=Math.min(10,Math.max(1,Math.round(spot)))}else{down++;if(down>3){out.push({dd:`4th & ${Math.max(1,Math.round(togo))} · ${spotLabel(10+spot)}`,t:`${pick([aq.last+' sneaks',ar.last+' bulls ahead'])} for the first down. They go for it and convert.`,cls:'bad'});down=1;togo=Math.min(10,Math.max(1,Math.round(spot)))}}
  }
  const ddT=`${ord(Math.min(4,down))} & ${Math.max(1,Math.round(togo))} · ${spotLabel(10+spot)}`;
  if(res==='TD'){const rc=pick(rcv);out.push({dd:ddT,t:Math.random()<.55?`${aq.last} hits ${rc.last} for a ${finalGain}-yard TOUCHDOWN.`:`${ar.last} breaks free for a ${finalGain}-yard TOUCHDOWN.`,cls:'bad big'})}
  else if(res==='FG')out.push({dd:'4th down · '+spotLabel(10+spot),t:`Field goal from ${Math.round(spot+17)} yards is good.`,cls:'bad'});
  else if(res==='PUNT')out.push({dd:'4th down · '+spotLabel(10+spot),t:`${S.away.abbr} punts. Your defense gets off the field.`,cls:'good'});
  else if(res==='TO'){const c=pick(label.includes('ick')||label==='Interception'?db:[...lb,...dl]);dx(c,label.includes('ick')||label==='Interception'?'dint':'tkl',1);dx(c,'xp',defTD?40:25);out.push({dd:ddT,t:(label==='Interception'||label==='Pick six!')?`INTERCEPTED by ${nm(c)}!${defTD?' He takes it all the way back for a touchdown!':''}`:`FUMBLE! Recovered by ${nm(c)}!${defTD?' Scoop and score!':''}`,cls:'good big'})}
  else out.push({dd:'Clock',t:'They run out the clock.'});
  return out;
}
function showTicker(o){
  clearInterval(tickTimer);
  $('#card').hidden=false;['#call','#opt','#toBtn','#bulletBtn'].forEach(s=>$(s).hidden=true);
  $('#dcEye').textContent=o.eye;$('#dcTeam').innerHTML=`${badge(o.team)}<b>${esc(teamName(o.team))}</b>`;
  const tk=$('#dcTicker');tk.innerHTML='';const res=$('#dcRes');res.hidden=true;res.textContent=o.res;res.style.setProperty('--c',o.good?S.home.c1:o.team.c1);
  $('#dcChips').innerHTML='';const tr=$('#dcTrack');tr.hidden=true;
  const scoreHTML=()=>`<div><small>${esc(S.home.abbr)}</small><strong>${S.score[0]}</strong></div><span class="mid">${S.ot?'OT':qName(S.q)+' · '+fmtClock(S.clock)}</span><div><small>${esc(S.away.abbr)}</small><strong>${S.score[1]}</strong></div>`;
  $('#dcScore').innerHTML=scoreHTML();
  let i=0,done=false;const btn=$('#dcGo');btn.textContent='Skip';
  const add=l=>{const e=document.createElement('div');e.className='tick '+(l.cls||'');e.innerHTML=`<span class="dd">${esc(l.dd)}</span><span>${esc(l.t)}</span>`;tk.appendChild(e);tk.scrollTop=tk.scrollHeight;if(l.cls&&l.cls.includes('big'))sfx(l.cls.includes('good')?'roar':'groan')};
  const finish=()=>{if(done)return;done=true;clearInterval(tickTimer);while(i<o.lines.length)add(o.lines[i++]);res.hidden=false;
    $('#dcChips').innerHTML=(o.chips||[]).map(([k,v])=>`<span><em>${esc(k)}</em>${esc(v)}</span>`).join('');
    if(o.from!=null){tr.hidden=false;const ez=tr.querySelectorAll('.ez');ez[0].style.background=S.home.c1;ez[1].style.background=S.away.c1;const f=tr.querySelector('.fill');f.style.setProperty('--c',o.team.c1);const pc=d=>6+clamp(d,0,100)*.88;f.style.left=pc(o.from)+'%';f.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{const a=pc(Math.max(0,o.to)),b=pc(o.from);f.style.left=a+'%';f.style.width=Math.max(0,b-a)+'%'}))}
    btn.textContent=o.btn;};
  cardNext=()=>{if(!done)return finish();$('#card').hidden=true;o.next&&o.next()};
  tickTimer=setInterval(()=>{if(S.paused)return;if(i<o.lines.length)add(o.lines[i++]);else finish()},420);
}
$('#dcGo').onclick=()=>{ac();cardNext&&cardNext()};

/* pause + sim to final */
$('#pauseBtn').onclick=()=>{if(['presnap','live','dead','pat','kick','wait','drive'].includes(S.phase)){S.paused=true;$('#pausem').hidden=false}};
$('#resume').onclick=()=>{S.paused=false;$('#pausem').hidden=true};
$('#quitHub').onclick=()=>{S.paused=false;$('#pausem').hidden=true;clearInterval(tickTimer);if(!LG.live)snapshot();saveNow(true);showHub('home')};
$('#simRest').onclick=()=>{S.paused=false;$('#pausem').hidden=true;simToFinal()};
function simToFinal(){
  clearInterval(tickTimer);['#call','#opt','#kick','#card'].forEach(s=>$(s).hidden=true);kick=null;
  const f=1-progress(),m=(offOvr(S.home)-defOvr(S.away))-(offOvr(S.away)-defOvr(S.home));
  const pts=x=>{x=Math.max(0,x);const td=Math.max(0,Math.round(x/7*.85+R(-.5,.5)));return td*7+Math.max(0,Math.round((x-td*7)/3))*3};
  if(!S.ot){S.score[0]+=pts(f*(26+m*4)+R(-6,6));S.score[1]+=pts(f*(26-m*4)*S.diffMul+R(-6,6))}
  if(S.score[0]===S.score[1]){if(Math.random()<.5+m/10)S.score[0]+=pick([6,7,8]);else S.score[1]+=pick([6,7,8])}
  S.simmed=true;gameOver();
}
function slowMo(d){S.slowT=Math.max(S.slowT,d);S.ts=.32}

/* ---------- post-game ---------- */
const ncaaRating=s=>s.att?((8.4*s.passYds)+(330*s.passTD)+(100*s.comp)-(200*s.int))/s.att:0;
function gameOver(){
  S.phase='over';hint('');clearInterval(tickTimer);['#sb','#pauseBtn','#toBtn','#bulletBtn','#call','#opt','#kick','#card'].forEach(s=>$(s).hidden=true);
  const g=S.game,[us,them]=S.score,won=us>them,s=S.stats,rate=ncaaRating(s),u=S.home,opp=S.away;
  const storm=won&&S.userHome&&rankOf(opp.id)&&rankOf(opp.id)<=10&&(!rankOf(u.id)||rankOf(u.id)>rankOf(opp.id)+5);
  if(S.userHome){g.hs=us;g.as=them}else{g.hs=them;g.as=us}
  recordGame(LG,g);
  const info={us,them,won,pst:S.pst,dxp:S.dxp,stats:s,storm,simmed:false};
  const rep=processUserGame(LG,g,info);LG.live=null;finishWeek(LG);
  let pog=null,best=-1;for(const p of u.roster){const sc=gameXP(S.pst[p.id])+((S.dxp[p.id]&&S.dxp[p.id].xp)||0);if(sc>best){best=sc;pog=p}}
  if(pog)LG.lastUserPOG=pog.id;
  const DEP=[['Deep 20+',20,99],['Mid 10–19',10,20],['Short 0–9',0,10],['Behind',-99,0]],LAT=[['Left',0,FW/3],['Middle',FW/3,FW*2/3],['Right',FW*2/3,99]];const zones={};
  for(const p of s.passes){const di=DEP.findIndex(([,a,b])=>p.depth>=a&&p.depth<b),li=LAT.findIndex(([,a,b])=>p.y>=a&&p.y<b);const k=di+'-'+Math.max(0,li);(zones[k]=zones[k]||{a:0,c:0,y:0}).a++;if(p.res==='C'){zones[k].c++;zones[k].y+=p.yds}}
  const hc=v=>v<.5?`color-mix(in srgb,var(--hot) ${Math.round((1-v*2)*100)}%,#E6B33C)`:`color-mix(in srgb,var(--ok) ${Math.round((v-.5)*200)}%,#E6B33C)`;
  const heat=DEP.map(([lab],di)=>`<span class="lab">${lab}</span>${LAT.map((l,li)=>{const z=zones[di+'-'+li];if(!z)return `<div class="cell"><small>—</small></div>`;const v=z.c/z.a;return `<div class="cell" style="background:color-mix(in srgb,${hc(v)} ${Math.round(25+Math.min(1,z.a/4)*45)}%,transparent);color:#fff"><b>${z.c}/${z.a}</b><small>${Math.round(v*100)}% · ${z.y} yds</small></div>`}).join('')}${di===2?'<span></span><div class="losl"></div>':''}`).join('');
  const top=Object.entries(S.pst).map(([id,st])=>({p:u.roster.find(x=>x.id==id),st})).filter(x=>x.p);
  const tline=(lab,k,fmt)=>{const b=top.slice().sort((a,c)=>c.st[k]-a.st[k])[0];return b&&b.st[k]?`<div class="lrow"><span class="l"><span class="num">${b.p.pos}</span><span>${lab}: <b>${esc(fullName(b.p))}</b></span></span><span>${fmt(b.st)}</span></div>`:''};
  const stam=OFF.filter(p=>['QB','RB','WR','TE'].includes(p.role)).map(p=>{const v=stamina(p.pl,true)*condF(p.pl,true);return `<div class="stamrow"><span>${p.role} ${esc(p.pl.last)} <span class="stars">${'★'.repeat(p.pl.end)}</span></span>${meterHTML(v*100,v>.85?'var(--ok)':v>.75?'var(--warn)':'var(--hot)')}<span>${Math.round(v*100)}%</span></div>`}).join('');
  $('#postBody').innerHTML=`
    ${storm?'<div class="storm">Fans storm the field!</div>':''}
    <div class="card hero"><div class="eyebrow">Final${S.ot?' · '+(S.otRound>1?S.otRound:'')+'OT':''}${g.tag?' · '+esc(g.tag):''}${S.simmed?' · simulated finish':''}</div>
      <div class="final"><div class="side">${badge(u,'lg')}<small>${esc(teamName(u))}</small><strong style="color:${u.c1}">${us}</strong></div><span class="eyebrow">–</span><div class="side">${badge(opp,'lg')}<small>${esc(teamName(opp))}</small><strong style="color:${opp.c1}">${them}</strong></div></div>
      <div class="result" style="color:${won?'var(--ok)':'var(--hot)'}">${won?'Victory':'Defeat'}</div>
      <div class="tags" style="justify-content:center"><span class="tag">+${rep.cc} CC</span><span class="tag ${rep.fan>=0?'ok':'hot'}">Fans ${rep.fan>=0?'+':''}${rep.fan}</span><span class="tag ${rep.mor>=0?'ok':'hot'}">Morale ${rep.mor>=0?'+':''}${rep.mor}</span>${g.rival&&won?`<span class="tag gold">${esc(u.trophy)} is yours</span>`:''}${(info.records||[]).map(r=>`<span class="tag gold">School record: ${esc(r)}</span>`).join('')}</div>
      ${pog?`<div class="lrow"><span class="l"><span class="tag gold">Player of the game</span><b>${esc(fullName(pog))}</b> · ${pog.pos}</span></div>`:''}</div>
    <div class="grid2"><div class="card"><div class="h2">Passing</div><div class="kpis">
        <div><em>QB rating</em><b>${rate.toFixed(1)}</b></div><div><em>Comp / Att</em><b>${s.comp}/${s.att}</b></div><div><em>Pass yds</em><b>${s.passYds}</b></div>
        <div><em>TD / INT</em><b>${s.passTD}/${s.int}</b></div><div><em>Yds after catch</em><b>${s.yac}</b></div><div><em>YAC / catch</em><b>${s.comp?(s.yac/s.comp).toFixed(1):'0.0'}</b></div>
        <div><em>Rush yds</em><b>${s.rushYds}</b></div><div><em>Yds / carry</em><b>${s.rushAtt?(s.rushYds/s.rushAtt).toFixed(1):'0.0'}</b></div><div><em>Sacks taken</em><b>${s.sacks}</b></div>
        <div><em>3rd down</em><b>${s.thirdC}/${s.thirdA}</b></div><div><em>Red zone TD</em><b>${s.rzTD}/${s.rzA}</b></div><div><em>Penalties</em><b>${s.pen}</b></div></div>
        <p class="note">QB rating uses the college passer-efficiency formula: about 130 is average and 160+ is elite.</p></div>
      <div class="card"><div class="h2">Completion heatmap</div><div class="heat"><span></span>${LAT.map(l=>`<span class="col">${l[0]}</span>`).join('')}${heat}</div><div class="legend">0%<i></i>100% completion · blue line is the line of scrimmage</div></div></div>
    <div class="grid2"><div class="card"><div class="h2">Top performers</div><div class="list">${tline('Passing','py',x=>`${x.pc}/${x.pa} · ${x.py} yds · ${x.ptd} TD`)}${tline('Rushing','ry',x=>`${x.ra} car · ${x.ry} yds`)}${tline('Receiving','recy',x=>`${x.rec} rec · ${x.recy} yds`)}</div></div>
      <div class="card"><div class="h2">Player development</div><div class="list">${rep.lev.slice(0,8).map(l=>`<div class="lrow"><span class="l"><span class="num">${l.pos}</span><span>${esc(l.name)}</span></span><span class="tag ok">${esc(l.attr)} → ${'★'.repeat(l.to)}</span></div>`).join('')||'<p class="note">No upgrades this week. Players earn XP from playing time and production.</p>'}
        ${rep.inj.map(i=>`<div class="lrow"><span class="l"><span class="num">${i.pos}</span><span>${esc(i.name)}</span></span><span class="tag hot">${esc(i.why)} · ${i.wk} wk</span></div>`).join('')}</div></div></div>
    <div class="card"><div class="h2">Stamina at the final whistle</div><p class="note">Speed drops steadily through a game. Higher stamina stars mean less drop-off; condition carries over week to week.</p>${stam}</div>
    <button class="btn wide" id="postGo">Continue</button>`;
  $('#post').hidden=false;$('#post .scroll').scrollTop=0;if(won)sfx('roar');if(storm){for(let i=0;i<6;i++)setTimeout(()=>sfx('roar'),i*300)}
  $('#postGo').onclick=()=>{S.simmed=false;showHub('home')};
  saveNow(true);
}
