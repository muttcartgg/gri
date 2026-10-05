/* =========================================================
   04 · Hub UI: save slots, team picker, dynasty hub, offseason
   ========================================================= */
let TAB='home',SETUP=null,ROSTER_FILTER='All';
const badge=(t,cls='')=>`<span class="badge ${cls}" style="--c1:${t.c1};--c2:${t.c2};--bt:${inkOn(t.c1)}">${esc(t.abbr)}</span>`;
const recStr=t=>`${t.rec.w}–${t.rec.l}`;
const tcell=(t,label)=>`<div class="tname">${badge(t,'sm')}<span>${esc(label||rankTag(t.id)+t.city)}</span></div>`;
function applyTeamTheme(t){const r=document.documentElement.style;r.setProperty('--team',t.c1);r.setProperty('--team2',t.c2);r.setProperty('--btn-ink',inkOn(t.c1))}
function applyStyle(){document.documentElement.dataset.style=(LG&&LG.settings.style)||'modern'}
let saveTimer=null;
function saveNow(now){if(!LG||!SLOT)return;clearTimeout(saveTimer);saveTimer=null;if(now){Saves.save(SLOT,LG);return}saveTimer=setTimeout(()=>{saveTimer=null;Saves.save(SLOT,LG)},700)}
function flushSave(){if(saveTimer){clearTimeout(saveTimer);saveTimer=null;Saves.save(SLOT,LG)}}
function hideAll(){['#hub','#setup','#post','#modal','#card','#pausem','#call','#opt','#kick','#sb','#pauseBtn','#toBtn','#bulletBtn'].forEach(s=>$(s).hidden=true);hint('')}
function openModal(html,wide){$('#modalBody').className='panel'+(wide?' wide':'');$('#modalBody').innerHTML=html;$('#modal').hidden=false;$('#modal').scrollTop=0}
const closeModal=()=>{$('#modal').hidden=true};
const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};
const winProb=(a,b,homeEdge)=>1/(1+Math.exp(-((teamOvr(a)-teamOvr(b))*2.2+(homeEdge||0)*.3)));

/* ---------- save slots ---------- */
function showSlots(){
  hideAll();S.phase='menu';LG=null;SLOT=null;document.documentElement.dataset.style='modern';
  const m=Saves.meta();
  $('#setupBody').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:6px"><div class="h1">Gridiron Live</div><div class="eyebrow">College football dynasty</div></div>
    <div class="slots">${SLOTS.map(n=>{const s=m.slots[n];if(!s)return `<button class="slot empty" id="slotNew-${n}"><span class="h2">+ New dynasty</span><span class="note">Slot ${n} is empty</span></button>`;
      return `<div class="slot" style="--team:${s.c1}"><div class="top"><span class="badge lg" style="--c1:${s.c1};--c2:${s.c2};--bt:${inkOn(s.c1)}">${esc(s.abbr)}</span><div style="min-width:0"><b>${esc(s.team)}</b><div class="note">${esc(s.name)} · ${esc(s.coach)}</div></div></div>
      <div class="tags"><span class="tag">${s.season} · ${esc(s.label)}</span><span class="tag">${esc(s.rec)}</span>${s.titles?`<span class="tag gold">${s.titles}× champion</span>`:''}${s.live?'<span class="tag hot">Game in progress</span>':''}</div>
      <div class="note">Slot ${n} · saved ${timeAgo(s.updated)}</div>
      <div class="btns"><button class="btn" id="slotGo-${n}">Continue</button><button class="btn ghost sm" id="slotDel-${n}">Delete</button></div>
      <div id="slotConf-${n}" hidden><p class="note" style="color:var(--hot)">Delete this dynasty for good?</p><div class="btns"><button class="btn danger sm" id="slotYes-${n}">Delete</button><button class="btn ghost sm" id="slotNo-${n}">Keep</button></div></div></div>`}).join('')}</div>
    <div class="card"><div class="setrow"><div><div class="h2">Have a save code?</div><p class="note">Paste a code from Settings › Export save to restore a dynasty on this device.</p></div><button class="btn ghost" id="importCode">Import save code</button></div></div>`;
  for(const n of SLOTS){
    on('slotNew-'+n,()=>showSetup(n));
    on('slotGo-'+n,()=>{flushSave();const L=Saves.load(n);if(!L){toast('That save could not be opened');return}LG=L;SLOT=n;bumpUID(LG);muted=!!LG.settings.muted;applyStyle();showHub('home')});
    on('slotDel-'+n,()=>{$('#slotConf-'+n).hidden=false});on('slotNo-'+n,()=>{$('#slotConf-'+n).hidden=true});on('slotYes-'+n,()=>{Saves.del(n);showSlots()});
  }
  on('importCode',()=>{
    openModal(`<div class="eyebrow">Import save</div><div class="h2">Paste your save code</div><textarea id="codeIn" placeholder="GL3:…"></textarea>
      <div class="setrow"><span class="eyebrow">Into slot</span><div class="seg" id="codeSlot">${SLOTS.map(n=>`<button data-v="${n}" aria-pressed="${n===1}">${n}${m.slots[n]?' (replace)':''}</button>`).join('')}</div></div>
      <p class="note" id="codeErr"></p><div class="btns"><button class="btn light" id="codeGo">Import</button><button class="btn ghost" id="codeX">Cancel</button></div>`);
    let slot=1;document.querySelectorAll('#codeSlot button').forEach(b=>b.onclick=()=>{slot=+b.dataset.v;document.querySelectorAll('#codeSlot button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    on('codeX',closeModal);
    on('codeGo',()=>{try{const L=Saves.importCode($('#codeIn').value);if(!L)throw 0;Saves.save(slot,L);closeModal();showSlots();toast('Save imported')}catch(e){$('#codeErr').textContent='That code could not be read. Make sure you copied all of it.'}});
  });
  $('#setup').hidden=false;
}

/* ---------- new dynasty: team picker ---------- */
function showSetup(slot){
  hideAll();S.phase='menu';
  SETUP={L:genNCAALeague(),slot,coach:'',name:'',diff:1,conf:'all',div:'FBS',sort:'prestige',q:'',league:'ncaa'};
  renderSetup();$('#setup').hidden=false;$('#setup .scroll').scrollTop=0;
}
function renderSetup(){
  const st=SETUP,L=st.L;invalidate();
  let teams=L.teams.slice();
  if(st.div!=='all')teams=teams.filter(t=>t.div===st.div);
  if(st.conf!=='all')teams=teams.filter(t=>t.conf===+st.conf);
  if(st.q)teams=teams.filter(t=>teamName(t).toLowerCase().includes(st.q.toLowerCase())||t.abbr.toLowerCase().includes(st.q.toLowerCase()));
  teams.sort(st.sort==='ovr'?(a,b)=>teamOvr(b)-teamOvr(a):st.sort==='name'?(a,b)=>a.city.localeCompare(b.city):(a,b)=>b.prestige-a.prestige||teamOvr(b)-teamOvr(a));
  const tagFor=t=>t.prestige>=5?'<span class="tag gold">Contender</span>':t.prestige<=1?'<span class="tag hot">Rebuild</span>':t.prestige<=2?'<span class="tag blue">Sleeper</span>':'';
  $('#setupBody').innerHTML=`
    <div class="setrow"><div><div class="eyebrow">New dynasty · slot ${st.slot}</div><div class="h1">Pick your program</div></div><button class="btn ghost sm" id="setBack">Back to saves</button></div>
    <div class="card"><div class="grid2">
      <div class="field-row"><label for="coachName">Coach name</label><input type="text" id="coachName" maxlength="24" placeholder="Coach Merchant" value="${esc(st.coach)}"></div>
      <div class="field-row"><label for="dynName">Dynasty name</label><input type="text" id="dynName" maxlength="28" placeholder="My Dynasty" value="${esc(st.name)}"></div></div>
      <div class="setrow"><span class="eyebrow">Difficulty</span><div class="seg" id="setDiff">${[[0,'Rookie'],[1,'Varsity'],[2,'All-American'],[3,'Heisman']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${v===st.diff}">${l}</button>`).join('')}</div></div></div>
    <div class="card"><div class="setrow"><span class="eyebrow">League</span><div class="seg" id="leagueSeg">${[['ncaa','All FBS & FCS'],['original','Original schools'],['pack','Load a team pack']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${st.league===v}">${l}</button>`).join('')}</div></div>
      <p class="note">${st.league==='ncaa'?`All ${L.teams.length} Division I programs: ${L.teams.filter(t=>t.div==='FBS').length} FBS and ${L.teams.filter(isFCS).length} FCS, in their ${L.confs.length} conferences for 2026, with team colors, real rivalries and strength based on recent results. Badges use abbreviations, not official logos. Players are generated; paste real rosters any time with a team pack.`:st.league==='pack'?'Your team pack is loaded.':'Thirty-two original schools you can rename and recolor.'}</p></div>
    <div class="card">
      ${L.teams.some(isFCS)?`<div class="chips" id="divChips">${[['FBS','FBS'],['FCS','FCS'],['all','All Division I']].map(([v,l])=>`<button class="chipbtn" data-v="${v}" aria-pressed="${st.div===v}">${l}</button>`).join('')}</div>`:''}
      <div class="field-row"><label for="confSel">Conference</label><select id="confSel"><option value="all">All conferences</option>${L.confs.map((c,i)=>[c,i]).filter(([c])=>st.div==='all'||c.div===st.div).map(([c,i])=>`<option value="${i}" ${String(i)===st.conf?'selected':''}>${esc(c.name)} (${L.teams.filter(t=>t.conf===i).length})</option>`).join('')}</select></div>
      <div class="setrow"><input type="search" id="teamQ" placeholder="Search schools" value="${esc(st.q)}" style="max-width:320px"><div class="seg" id="sortSeg">${[['prestige','Prestige'],['ovr','Overall'],['name','A–Z']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${st.sort===v}">${l}</button>`).join('')}</div></div>
      <div class="teampick">${teams.map(t=>`<button class="tp" id="tp-${t.id}" style="--c1:${t.c1}">${badge(t)}<span class="meta"><b>${esc(teamName(t))}</b><small>${esc(confName(t.conf,L))} · ${starStr(t.prestige)}</small><span class="tags">${tagFor(t)}</span></span><span class="ovr">${teamOvr(t).toFixed(1)}<small>OVR</small></span></button>`).join('')||'<p class="note">No schools match that search.</p>'}</div>
      <button class="btn ghost" id="customProg">Build a custom program from scratch</button>
    </div>`;
  on('setBack',showSlots);
  $('#coachName').oninput=e=>st.coach=e.target.value;$('#dynName').oninput=e=>st.name=e.target.value;
  document.querySelectorAll('#setDiff button').forEach(b=>b.onclick=()=>{st.diff=+b.dataset.v;renderSetupKeep()});
  document.querySelectorAll('#leagueSeg button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;
    if(v==='original'){st.L=genLeague();st.league=v;st.conf='all';st.div='all';renderSetupKeep()}
    else if(v==='ncaa'){st.L=genNCAALeague();st.league=v;st.conf='all';st.div='FBS';renderSetupKeep()}
    else openPackImport(st.L,()=>{st.league='pack';renderSetupKeep()},true)});
  document.querySelectorAll('#divChips button').forEach(b=>b.onclick=()=>{st.div=b.dataset.v;st.conf='all';renderSetupKeep()});
  const cs=$('#confSel');if(cs)cs.onchange=()=>{st.conf=cs.value;renderSetupKeep()};
  document.querySelectorAll('#sortSeg button').forEach(b=>b.onclick=()=>{st.sort=b.dataset.v;renderSetupKeep()});
  $('#teamQ').oninput=e=>{st.q=e.target.value;renderSetupKeep();const i=$('#teamQ');i.focus();i.setSelectionRange(i.value.length,i.value.length)};
  document.querySelectorAll('.tp').forEach(b=>b.onclick=()=>openTeamDetail(+b.id.slice(3)));
  on('customProg',openCustomProgram);
}
function renderSetupKeep(){const y=$('#setup .scroll').scrollTop;renderSetup();$('#setup .scroll').scrollTop=y}
function openTeamDetail(id){
  const L=SETUP.L,t=L.teams[id];applyTeamTheme(t);
  const top=t.roster.slice().sort((a,b)=>ovr(b)-ovr(a)).slice(0,5);const riv=t.rival!=null?L.teams[t.rival]:null;
  const bar=(l,v)=>`<div class="bar"><span>${l}</span>${meterHTML((v-1)/4*100,t.c1)}<b>${v.toFixed(1)}</b></div>`;
  openModal(`<div style="display:flex;gap:14px;align-items:center">${badge(t,'xl')}<div style="min-width:0"><div class="eyebrow">${esc(confName(t.conf,L))} · ${t.div}</div><div class="h2" style="font-size:24px">${esc(teamName(t))}</div><div>${starStr(t.prestige)} <span class="note">prestige</span></div></div></div>
    <div class="bars">${bar('Offense',offOvr(t))}${bar('Defense',defOvr(t))}${bar('Overall',teamOvr(t))}</div>
    <div class="list">
      <div class="lrow"><span class="note">Stadium</span><span>${esc(t.stadium)} · ${(t.cap/1000).toFixed(0)}K seats</span></div>
      <div class="lrow"><span class="note">Rival</span><span>${riv?esc(riv.city)+' · '+esc(t.trophy):'None'}</span></div>
      <div class="lrow"><span class="note">AD expectation</span><span>${adTarget(t)}+ wins a season</span></div>
    </div>
    <div><div class="eyebrow" style="margin-bottom:6px">Best players</div><div class="list">${top.map(p=>`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span>${esc(fullName(p))} · ${yrStr(p)}</span></span>${starStr(ovr(p))}</div>`).join('')}</div></div>
    <div class="btns"><button class="btn" id="coachHere">Coach here</button><button class="btn ghost" id="tdEdit">Rename &amp; recolor</button><button class="btn ghost" id="tdX">Back</button></div>`);
  on('tdX',closeModal);on('tdEdit',()=>openEditor(id,()=>openTeamDetail(id),SETUP.L));
  on('coachHere',()=>startDynasty(id));
}
function openCustomProgram(){
  const L=SETUP.L;
  openModal(`<div class="eyebrow">Build from scratch</div><div class="h2">Create your program</div><p class="note">Your new school starts at one-star prestige with a thin roster. It takes a spot in the conference you choose.</p>
    <div class="field-row"><label for="cpCity">School</label><input type="text" id="cpCity" maxlength="22" placeholder="Riverside State"></div>
    <div class="field-row"><label for="cpName">Mascot</label><input type="text" id="cpName" maxlength="16" placeholder="Thunder"></div>
    <div class="field-row"><label for="cpAbbr">Abbreviation</label><input type="text" id="cpAbbr" maxlength="4" placeholder="RSU" style="text-transform:uppercase"></div>
    <div class="colors"><div class="field-row"><label for="cpC1">Primary</label><input type="color" id="cpC1" value="#6A1B9A"></div><div class="field-row"><label for="cpC2">Secondary</label><input type="color" id="cpC2" value="#F2C230"></div></div>
    <div class="field-row"><label for="cpConf">Conference</label><select id="cpConf">${L.confs.map((c,i)=>c.ind?'':`<option value="${i}">${esc(c.name)} · ${c.div}</option>`).join('')}</select></div>
    <p class="note" id="cpErr"></p>
    <div class="btns"><button class="btn" id="cpGo">Create &amp; coach</button><button class="btn ghost" id="cpX">Cancel</button></div>`);

  on('cpX',closeModal);
  on('cpGo',()=>{
    const city=$('#cpCity').value.trim(),name=$('#cpName').value.trim();if(!city||!name){$('#cpErr').textContent='Give your school a name and a mascot.';return}
    const conf=+$('#cpConf').value;const slotT=L.teams.filter(t=>t.conf===conf).sort((a,b)=>qOf(a)-qOf(b))[0];
    const fresh=genTeam(slotT.id,city,name,$('#cpC1').value,1,conf,{exact:true,div:slotT.div,q:slotT.div==='FCS'?1.2:1.7});
    if(slotT.rival!=null){const r=L.teams[slotT.rival];r.rival=null;slotT.rival=null}
    Object.assign(slotT,{city,name,abbr:($('#cpAbbr').value.trim()||city.slice(0,3)).toUpperCase().slice(0,4),c1:$('#cpC1').value,c2:$('#cpC2').value,prestige:1,q:fresh.q,roster:fresh.roster,stadium:city+' Stadium',cap:22000});
    invalidate();resetRecords(L);buildSchedule(L);updateRankings(L);startDynasty(slotT.id);
  });
}
function startDynasty(id){
  const st=SETUP,L=st.L;closeModal();
  L.user=id;L.coach.name=st.coach.trim()||'Coach';L.name=st.name.trim()||`${L.teams[id].city} Dynasty`;L.settings.diff=st.diff;L.coach.schools=[id];
  const t=L.teams[id];L.fac={stadium:clamp(t.prestige-1,1,5),training:clamp(t.prestige-1,1,5),rehab:clamp(t.prestige-2,1,5)};
  L.captains=t.roster.filter(p=>p.yr>=3).sort((a,b)=>ovr(b)-ovr(a)).slice(0,2).map(p=>p.id);
  L.nil=300+t.prestige*120;setHomecoming(L);seedRecords(L);
  L.news=[{t:`${L.coach.name} is introduced as head coach of ${teamName(t)}. The AD expects ${adTarget(t)}+ wins.`,good:true}];
  LG=L;SLOT=st.slot;SETUP=null;applyStyle();saveNow(true);showHub('home');
}

/* ---------- hub ---------- */
const TABS=[['home','Home'],['schedule','Schedule'],['rankings','Rankings'],['team','Roster'],['program','Program'],['stats','Stats'],['league','League'],['settings','Settings']];
function showHub(tab){
  invalidate();hideAll();if(tab)TAB=tab;S.phase='hub';applyStyle();
  const u=T(LG.user);applyTeamTheme(u);
  $('#hubTop').innerHTML=`${badge(u,'lg')}<div class="who"><b>${esc(teamName(u))}</b><small>${LG.season} · ${esc(weekLabel(LG))} · ${confName(u.conf)} · ${esc(LG.coach.name)}</small></div>
    <div class="pills"><span class="pill">${recStr(u)}</span>${rankOf(u.id)?`<span class="pill gold">#${rankOf(u.id)}</span>`:''}<span class="pill" title="Coaching credits">${LG.credits} CC</span><span class="pill" title="NIL collective">${money(LG.nil)} NIL</span></div>`;
  $('#tabs').innerHTML=TABS.map(([k,l])=>`<button role="tab" id="tab-${k}" aria-selected="${TAB===k}">${k==='home'&&LG.phase==='offseason'?'Offseason':l}${k==='home'&&LG.event?'<span class="dot"></span>':''}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{showHub(b.id.slice(4));$('#hubScroll').scrollTop=0});
  $('#hubBody').innerHTML=({home:hubHome,schedule:hubSchedule,rankings:hubRankings,team:hubTeam,program:hubProgram,stats:hubStats,league:hubLeague,settings:hubSettings})[TAB]();
  bindHub();$('#hub').hidden=false;
  if(TAB==='home'&&LG.event&&$('#modal').hidden)openEvent();
}
function rerender(){const y=$('#hubScroll').scrollTop;showHub();$('#hubScroll').scrollTop=y}

function hubHome(){
  if(LG.phase==='offseason')return hubOffseason();
  const u=T(LG.user),w=LG.weeks[LG.week],g=userGameThisWeek();
  let main='';
  if(LG.live&&g){main+=`<div class="card hero"><div class="eyebrow">Game in progress</div><div class="h2">${esc(u.city)} ${LG.live.score[0]} – ${LG.live.score[1]} ${esc(T(LG.live.opp).city)} · ${LG.live.ot?'OT':qName(LG.live.q)+' '+fmtClock(LG.live.clock)}</div><div class="btns"><button class="btn" id="resumeGame">Resume game</button><button class="btn ghost" id="abandonGame">Sim the rest</button></div></div>`}
  else if(g){
    const opp=T(g.h===LG.user?g.a:g.h),home=g.h===LG.user&&!g.neutral;const wp=winProb(u,opp,home?1:g.neutral?0:-1);
    main+=`<div class="card hero"><div class="eyebrow">${esc(w.label)}${g.neutral?' · Neutral site':home?' · Home':' · Away'}</div>
      <div class="tags">${gameFlags(LG,g,LG.week).map(([c,l])=>`<span class="tag ${c}">${esc(l)}</span>`).join('')}</div>
      <div class="matchup"><div class="side">${badge(u,'lg')}<b>${rankTag(u.id)}${esc(u.city)}</b><small>${recStr(u)} · OVR ${teamOvr(u).toFixed(1)}</small></div><span class="vs">${home||g.neutral?'VS':'AT'}</span>
      <div class="side">${badge(opp,'lg')}<b>${rankTag(opp.id)}${esc(opp.city)}</b><small>${recStr(opp)} · OVR ${teamOvr(opp).toFixed(1)}</small></div></div>
      <div class="tags"><span class="tag">${WX_ICON[g.wx]} ${g.wx}</span><span class="tag">${g.slot} kickoff</span><span class="tag ${wp>=.5?'ok':'hot'}">Win chance ${pct(wp)}</span></div>
      <div class="btns"><button class="btn" id="playGame">Play game</button><button class="btn ghost" id="simGame">Sim game</button></div></div>`;
  }else if(w){
    main+=`<div class="card"><div class="eyebrow">${esc(w.label)}</div><div class="h2">${LG.week>=LG.R?'Your season is over. The postseason goes on.':'Bye week'}</div><div class="list">${w.games.slice(0,10).map(x=>`<div class="lrow"><span class="l">${tcell(T(x.h))} <span class="note">vs</span> ${tcell(T(x.a))}</span><span class="note">${esc(x.tag||'')}</span></div>`).join('')}</div><button class="btn" id="advWeek">Sim ${esc(w.label)}</button></div>`;
  }
  const tgt=adTarget(u),sec=LG.coach.security;
  const ad=`<div class="card"><div class="eyebrow">Athletic director</div><div class="kv"><span>Expectation</span><b>${tgt}+ wins</b></div><div class="kv"><span>Job security</span><b class="${sec<30?'res-l':''}">${sec<25?'Hot seat':sec<50?'Uneasy':sec<80?'Stable':'Untouchable'}</b></div>${meterHTML(sec)}
    <div class="kv"><span>Fan approval</span><b>${Math.round(LG.fan)}%</b></div>${meterHTML(LG.fan)}<div class="kv"><span>Locker room</span><b>${Math.round(LG.morale)}%</b></div>${meterHTML(LG.morale)}</div>`;
  const heis=LG.heismanWatch&&LG.heismanWatch.length?`<div class="card"><div class="eyebrow">Heisman watch</div><div class="list">${LG.heismanWatch.map((h,i)=>`<div class="lrow"><span class="l"><span class="rank">${i+1}</span>${badge(T(h.team),'sm')}<span><b>${esc(h.name)}</b> <span class="note">${h.pos}</span><br><small class="note">${esc(h.line)}</small></span></span></div>`).join('')}</div></div>`:'';
  const potw=LG.potw?`<div class="card"><div class="eyebrow">${confName(u.conf)} player of the week</div><div class="tname">${badge(T(LG.potw.team))}<span><b>${esc(LG.potw.name)}</b> · ${LG.potw.pos} · ${esc(T(LG.potw.team).city)}</span></div></div>`:'';
  const lw=LG.lastWeek?`<div class="card"><div class="eyebrow">Around the league · ${esc(LG.lastWeek.label)}</div><div class="list">${LG.lastWeek.games.filter(x=>x.h===LG.user||x.a===LG.user||(x.tag&&!/First Round|Second Round/.test(x.tag))||x.upset||((x.rh||x.ra)&&T(x.h).div===u.div)||T(x.h).conf===u.conf).sort((a,b)=>((b.h===LG.user||b.a===LG.user)-(a.h===LG.user||a.a===LG.user))||(!!(b.rh||b.ra)-!!(a.rh||a.ra))).slice(0,14).map(x=>{const hw=x.hs>x.as;return `<div class="lrow"><span class="l">${tcell(T(x.h),(x.rh?'#'+x.rh+' ':'')+T(x.h).city)}<b class="${hw?'res-w':''}">${x.hs}</b><span class="note">–</span><b class="${!hw?'res-w':''}">${x.as}</b>${tcell(T(x.a),(x.ra?'#'+x.ra+' ':'')+T(x.a).city)}</span>${x.upset?'<span class="tag hot">Upset</span>':x.tag?`<span class="note">${esc(x.tag)}</span>`:''}</div>`}).join('')}</div></div>`:'';
  const news=LG.news.length?`<div class="card"><div class="eyebrow">Headlines</div><div class="list">${LG.news.slice(0,5).map(n=>`<div class="lrow"><span>${n.good?'<span class="tag ok">Program</span> ':''}${esc(n.t)}</span></div>`).join('')}</div></div>`:'';
  const cs=confStandings(LG,u.conf);
  const conf=`<div class="card"><div class="eyebrow">${confName(u.conf)} standings</div><div class="tw"><table><thead><tr><th>Team</th><th class="n">Conf</th><th class="n">All</th></tr></thead><tbody>${cs.map(t=>`<tr class="${t.id===LG.user?'me':''}"><td>${tcell(t)}</td><td class="n">${t.rec.cw}–${t.rec.cl}</td><td class="n">${recStr(t)}</td></tr>`).join('')}</tbody></table></div></div>`;
  return main+`<div class="grid2">${ad}${heis||potw}</div><div class="grid2">${lw||news}${conf}</div>${lw&&news?`<div class="grid2">${news}${potw&&heis?potw:''}</div>`:''}`;
}
function hubSchedule(){
  const rows=LG.weeks.map((w,i)=>{const g=w.games.find(x=>x.h===LG.user||x.a===LG.user);if(!g)return w.kind==='reg'?`<tr class="${i===LG.week?'me':''}"><td>Wk ${i+1}</td><td class="note">Bye week</td><td></td></tr>`:'';const home=g.h===LG.user,opp=T(home?g.a:g.h);
    let res='';if(g.hs!=null){const us=home?g.hs:g.as,them=home?g.as:g.hs;res=`<span class="${us>them?'res-w':'res-l'}">${us>them?'W':'L'} ${us}–${them}</span>`}else res=i===LG.week?'<span class="tag blue">Next</span>':`<span class="note">${WX_ICON[g.wx]}</span>`;
    const fl=gameFlags(LG,g,i).filter(f=>f[1]!=='Conference game').map(([c,l])=>`<span class="tag ${c}">${esc(l)}</span>`).join(' ');
    return `<tr class="${i===LG.week?'me':''}"><td>${esc(w.kind==='reg'?'Wk '+(i+1):'Post')}</td><td><div class="tname">${g.neutral?'vs':home?'vs':'at'} ${badge(opp,'sm')}<span>${esc(rankTag(opp.id)+teamName(opp))}</span></div>${fl?`<div class="tags" style="margin-top:4px">${fl}</div>`:''}</td><td class="n">${res}</td></tr>`}).join('');
  return `<div class="card"><div class="h2">${LG.season} schedule</div><p class="note">Twelve games with a bye, conference games late and Rivalry Week to finish. Conference title games, bowls and the playoffs follow (12-team CFP for FBS, 24-team bracket for FCS).</p><div class="tw"><table><thead><tr><th>Week</th><th>Opponent</th><th class="n">Result</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
let RANK_DIV=null;
function hubRankings(){
  const u=T(LG.user),hasF=LG.teams.some(isFCS);const div=RANK_DIV||u.div;const list=div==='FCS'?LG.rankF:LG.rank;
  const toggle=hasF?`<div class="chips" id="rankDiv">${['FBS','FCS'].map(d=>`<button class="chipbtn" data-v="${d}" aria-pressed="${div===d}">${d} poll</button>`).join('')}</div>`:'';
  const poll=`<div class="card"><div class="setrow"><div class="h2">${pollName(LG,div)}</div>${toggle}</div><div class="tw"><table><thead><tr><th class="n">#</th><th>Team</th><th>Conf</th><th class="n">Record</th><th class="n">OVR</th></tr></thead><tbody>${list.slice(0,25).map((id,i)=>{const t=T(id);return `<tr class="${id===LG.user?'me':''}"><td class="n">${i+1}</td><td>${tcell(t,teamName(t))}</td><td class="note">${esc(confName(t.conf))}</td><td class="n">${recStr(t)}</td><td class="n">${teamOvr(t).toFixed(1)}</td></tr>`}).join('')}</tbody></table></div></div>`;
  const m=(g,lab,seeds)=>g?`<div class="bm"><span class="note">${esc(lab||'')}</span>${[g.h,g.a].map(id=>`<div class="t ${g.hs!=null&&winner(g)===id?'w':''} ${id===LG.user?'me':''}"><span>${seeds&&seeds.indexOf(id)>=0?seeds.indexOf(id)+1+' ':''}${esc(T(id).city)}</span><span>${g.hs==null?'':id===g.h?g.hs:g.as}</span></div>`).join('')}</div>`:'<div class="bm"><span class="note">TBD</span></div>';
  let br='';
  if(LG.cfp&&div==='FBS'){const c=LG.cfp;
    br=`<div class="card"><div class="h2">College Football Playoff</div><p class="note">Twelve teams: the five highest-ranked conference champions plus the seven highest-ranked teams remaining, seeded by ranking. Seeds 1–4 get a bye; first-round games are on campus.</p>
      <div class="tw"><div class="bracket"><div class="col"><span class="eyebrow">First round</span>${c.r1.map(g=>m(g,'',c.seeds)).join('')}</div><div class="col"><span class="eyebrow">Quarterfinals</span>${(c.qf.length?c.qf:[0,1,2,3].map(()=>null)).map((g,k)=>g?m(g,CFP_QF[k],c.seeds):`<div class="bm"><span class="note">#${k+1} ${esc(T(c.seeds[k]).city)} awaits</span></div>`).join('')}</div><div class="col"><span class="eyebrow">Semifinals</span>${(c.sf.length?c.sf:[null,null]).map((g,k)=>m(g,CFP_SF[k],c.seeds)).join('')}</div><div class="col"><span class="eyebrow">Championship</span>${m(c.final,'National Championship',c.seeds)}${LG.champ!=null?`<div class="tag gold">Champion: ${esc(T(LG.champ).city)}</div>`:''}</div></div></div></div>`}
  if(LG.fcsp&&div==='FCS'){const c=LG.fcsp;const col=(lab,arr)=>`<div class="col"><span class="eyebrow">${lab}</span>${(arr&&arr.length?arr:[null]).map(g=>m(g,'',c.seeds)).join('')}</div>`;
    br=`<div class="card"><div class="h2">FCS Playoffs</div><p class="note">Twenty-four teams: automatic bids for conference champions plus at-large picks, seeded by ranking. Seeds 1–8 get a bye. The MEAC and SWAC champions meet in the Celebration Bowl instead.</p><div class="tw"><div class="bracket" style="grid-template-columns:repeat(5,minmax(150px,1fr))">${col('First round',c.r1.filter(Boolean))}${col('Second round',c.r2.filter(Boolean))}${col('Quarterfinals',c.qf.filter(Boolean))}${col('Semifinals',c.sf.filter(Boolean))}<div class="col"><span class="eyebrow">Championship</span>${m(c.final,'FCS National Championship',c.seeds)}${LG.champF!=null?`<div class="tag gold">Champion: ${esc(T(LG.champF).city)}</div>`:''}</div></div></div></div>`}
  const bw=LG.weeks[LG.R+1]?LG.weeks[LG.R+1].games.filter(g=>g.bowl):[];
  const bowls=bw.length&&div==='FBS'?`<div class="card"><div class="h2">Bowl season · ${bw.length} games</div><div class="list">${bw.map(g=>`<div class="lrow"><span class="l"><b>${esc(g.tag)}</b></span><span class="l">${tcell(T(g.h))} ${g.hs!=null?g.hs+'–'+g.as:'vs'} ${tcell(T(g.a))}</span></div>`).join('')}</div></div>`:'';
  return br+poll+bowls;
}
function hubTeam(){
  const u=T(LG.user);const pos=ROSTER_FILTER==='All'?POS_ORDER:[ROSTER_FILTER];
  const inj=u.roster.filter(p=>p.inj>0);
  return `<div class="card"><div class="setrow"><div class="h2">Roster · ${u.roster.length}/${ROSTER_CAP} scholarships</div><span class="pill">${LG.credits} CC</span></div>
    <p class="note">Tap a player to upgrade ratings with coaching credits, set the depth chart, redshirt, or name captains. ${inj.length?`<b style="color:var(--hot)">${inj.length} unavailable this week.</b>`:''}</p>
    <div class="chips" id="rosChips">${['All',...POS_ORDER].map(p=>`<button class="chipbtn" data-v="${p}" aria-pressed="${ROSTER_FILTER===p}">${p}</button>`).join('')}</div></div>
  ${pos.map(ps=>`<div class="card"><div class="eyebrow">${POS_NAME[ps]} · ${STARTERS[ps]} starting</div><div>${depth(u,ps).map((p,i)=>`<button class="rrow" id="pl-${p.id}"><span class="num">${p.num}</span><span class="meta"><b>${esc(fullName(p))} <small>${yrStr(p)}${i<STARTERS[ps]&&p.inj<=0&&!p.redshirt?' · Starter':''}${LG.captains.includes(p.id)?' · C':''}</small> ${p.inj>0?`<span class="tag hot">${esc(p.injWhy||'Injured')} · ${p.inj} wk</span>`:''}${p.redshirt?'<span class="tag blue">Redshirt</span>':''}</b><span class="attrs">${PATTR[p.pos].map(k=>`<span>${attrShort(p.pos,k)} ${starStr(p[k])}</span>`).join('')}</span><span style="display:grid;grid-template-columns:auto 1fr auto 1fr;gap:6px;align-items:center;font-size:10.5px;color:var(--mute)"><span>COND</span>${meterHTML(p.cond)}<span>XP</span>${meterHTML(p.xp,'var(--los)')}</span></span>${starStr(ovr(p))}</button>`).join('')}</div></div>`).join('')}`;
}
function hubProgram(){
  const c=LG.coach,u=T(LG.user),f=LG.fac;
  const FAC={stadium:['Stadium','More coaching credits from home games, plus a bonus when fan approval is above 70%.'],training:['Training facility','+20% XP per level for every player.'],rehab:['Rehab center','Faster condition recovery each week and shorter injuries.']};
  const FOCUS={balanced:['Balanced','No special boost.'],passing:['Passing','Tighter QB accuracy and surer hands this week.'],running:['Running','Ball carriers break more tackles; the line blocks longer.'],conditioning:['Conditioning','Players tire 30% slower this week.'],film:['Film study','Your defense reads their offense better this week.']};
  const staffCard=(k,s)=>`<div class="lrow"><span class="l"><span class="tag">${k.toUpperCase()}</span><span><b>${esc(s.name)}</b> ${starStr(s.r)}<br><small class="note">${esc(s.trait)}: ${(k==='oc'?OC_TRAITS:DC_TRAITS)[s.trait]}</small></span></span></div>`;
  return `<div class="grid2">
    <div class="card"><div class="eyebrow">Head coach</div><div class="h2">${esc(c.name)}</div>
      <div class="kv"><span>Career record</span><b>${c.w}–${c.l}</b></div><div class="kv"><span>Seasons</span><b>${c.seasons}</b></div>
      <div class="kv"><span>National titles</span><b>${c.natties}</b></div><div class="kv"><span>Conference titles</span><b>${c.confs}</b></div><div class="kv"><span>Bowl wins</span><b>${c.bowls}</b></div><div class="kv"><span>Playoff trips</span><b>${c.playoffs}</b></div><div class="kv"><span>Coach of the Year</span><b>${c.coy}</b></div>
      <div class="kv"><span>Job security</span><b>${Math.round(c.security)}%</b></div>${meterHTML(c.security)}</div>
    <div class="card"><div class="eyebrow">Program pulse</div>
      <div class="kv"><span>Fan approval</span><b>${Math.round(LG.fan)}%</b></div>${meterHTML(LG.fan)}
      <div class="kv"><span>Locker room morale</span><b>${Math.round(LG.morale)}%</b></div>${meterHTML(LG.morale)}
      <p class="note">Morale nudges player speed on game day. Fan approval drives coaching credits and recruiting.</p>
      <div class="kv"><span>Captains</span><b>${LG.captains.map(id=>{const p=u.roster.find(x=>x.id===id);return p?esc(p.last):''}).filter(Boolean).join(', ')||'None'}</b></div>
      <div class="kv"><span>NIL collective</span><b>${money(LG.nil)}</b></div><p class="note">NIL money signs transfer-portal players and boosts recruiting in the offseason.</p></div></div>
  <div class="card"><div class="h2">This week's practice</div>
    <div class="seg" id="focusSeg">${Object.entries(FOCUS).map(([k,[l]])=>`<button data-v="${k}" aria-pressed="${LG.focus===k}">${l}</button>`).join('')}</div><p class="note">${FOCUS[LG.focus][1]}</p>
    <div class="setrow"><span class="eyebrow">Training regime</span><div class="seg" id="regSeg">${Object.entries(REGIMES).map(([k,r])=>`<button data-v="${k}" aria-pressed="${LG.regime===k}">${r.label}</button>`).join('')}</div></div>
    <p class="note">${LG.regime==='light'?'Less XP, but players stay fresher and get hurt less.':LG.regime==='hard'?'35% more XP, but players wear down faster and get hurt more.':'Standard XP, wear and injury risk.'}</p></div>
  <div class="card"><div class="h2">Facilities</div>${Object.entries(FAC).map(([k,[n,d]])=>`<div class="setrow"><div style="min-width:0;flex:1"><b>${n}</b><div class="pips">${[1,2,3,4,5].map(i=>`<i class="${i<=f[k]?'on':''}"></i>`).join('')}</div><p class="note">${d}</p></div>${f[k]<5?`<button class="btn sm" id="fac-${k}" ${LG.credits<f[k]*6?'disabled':''}>Upgrade · ${f[k]*6} CC</button>`:'<span class="tag gold">Maxed</span>'}</div>`).join('')}</div>
  <div class="card"><div class="h2">Coordinators</div><div class="list">${staffCard('oc',LG.staff.oc)}${staffCard('dc',LG.staff.dc)}</div>
    <div class="eyebrow">Available to hire</div><div class="list">${['oc','dc'].flatMap(k=>LG.pool[k].map((s,i)=>`<div class="lrow"><span class="l"><span class="tag">${k.toUpperCase()}</span><span><b>${esc(s.name)}</b> ${starStr(s.r)}<br><small class="note">${esc(s.trait)}: ${(k==='oc'?OC_TRAITS:DC_TRAITS)[s.trait]}</small></span></span><button class="btn sm" id="hire-${k}-${i}" ${LG.credits<staffCost(s)?'disabled':''}>Hire · ${staffCost(s)} CC</button></div>`)).join('')}</div>
    <p class="note">Offensive coordinator stars help receivers get open. Defensive coordinator stars make your simulated defense stronger.</p></div>
  <div class="card"><div class="h2">Trophy case</div><div class="grid3">
    <div class="kpis"><div><em>National titles</em><b>${u.titles}</b></div></div><div class="kpis"><div><em>Conference titles</em><b>${u.ccTitles}</b></div></div><div class="kpis"><div><em>Bowl wins</em><b>${u.bowlWins}</b></div></div><div class="kpis"><div><em>Playoff trips</em><b>${u.playoffApps||0}</b></div></div></div>
    <div class="kv"><span>${esc(u.trophy)} vs ${esc(T(u.rival).city)}</span><b>${u.holder===u.id?'In your case':'Held by '+esc(T(u.rival).city)}</b></div></div>`;
}
function hubStats(){
  const u=T(LG.user),ts=LG.ts,g=Math.max(1,ts.g);
  const lead=(lab,k,fmt)=>{const p=u.roster.slice().sort((a,b)=>b.ss[k]-a.ss[k])[0];return p&&p.ss[k]>0?`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span>${lab}: <b>${esc(fullName(p))}</b></span></span><span>${fmt(p)}</span></div>`:''};
  const recs=Object.values(LG.records);
  return `<div class="card"><div class="h2">${LG.season} team stats</div><div class="kpis">
    <div><em>Points / game</em><b>${(ts.pf/g).toFixed(1)}</b></div><div><em>Allowed / game</em><b>${(ts.pa/g).toFixed(1)}</b></div><div><em>Pass yds / game</em><b>${Math.round(ts.py/g)}</b></div><div><em>Rush yds / game</em><b>${Math.round(ts.ry/g)}</b></div>
    <div><em>3rd down</em><b>${ts.thirdA?pct(ts.thirdC/ts.thirdA):'—'}</b></div><div><em>Red zone TD</em><b>${ts.rzA?pct(ts.rzTD/ts.rzA):'—'}</b></div><div><em>Turnovers</em><b>${ts.to}</b></div><div><em>Penalties</em><b>${ts.pen}</b></div></div>
    <p class="note">Third-down, red-zone and penalty numbers count games you play yourself.</p></div>
  <div class="grid2"><div class="card"><div class="h2">Team leaders</div><div class="list">
    ${lead('Passing','py',p=>`${p.ss.py} yds · ${p.ss.ptd} TD`)}${lead('Rushing','ry',p=>`${p.ss.ry} yds · ${p.ss.rtd} TD`)}${lead('Receiving','recy',p=>`${p.ss.recy} yds · ${p.ss.rectd} TD`)}${lead('Tackles','tkl',p=>p.ss.tkl)}${lead('Sacks','sck',p=>p.ss.sck)}${lead('Interceptions','dint',p=>p.ss.dint)}</div></div>
  <div class="card"><div class="h2">School records</div>${recs.length?`<div class="list">${recs.map(r=>`<div class="lrow"><span class="l"><span>${esc(r.label)}: <b>${esc(r.who)}</b> <small class="note">${r.season}${r.extra?' · '+esc(r.extra):''}</small></span></span><b>${r.v}</b></div>`).join('')}</div>`:'<p class="note">Records are set when you play games.</p>'}</div></div>
  ${LG.awards.length?`<div class="card"><div class="h2">Awards</div><div class="list">${LG.awards.map(a=>{const mine=[...a.allAm.filter(x=>x.team===LG.user).map(x=>x.name+' (All-American)'),...a.allConf.filter(x=>x.team===LG.user).map(x=>x.name+' (All-Conference)'),...a.frosh.filter(x=>x.team===LG.user).map(x=>x.name+' (Freshman All-American)')];return `<div class="lrow"><span><b>${a.season}</b> · Heisman: ${a.heisman?esc(a.heisman.name)+' ('+esc(T(a.heisman.team).city)+')':'—'} · Coach of the Year: ${esc(T(a.coy).city)}${mine.length?`<br><small class="note">Your honorees: ${esc(mine.join(', '))}</small>`:''}</span></div>`}).join('')}</div></div>`:''}
  ${LG.history.length?`<div class="card"><div class="h2">Program history</div><div class="tw"><table><thead><tr><th>Season</th><th>School</th><th class="n">Record</th><th class="n">Rank</th><th>Postseason</th></tr></thead><tbody>${LG.history.slice().reverse().map(h=>`<tr><td>${h.season}</td><td>${esc(T(h.team!=null?h.team:LG.user).city)}</td><td class="n">${h.w}–${h.l}</td><td class="n">${h.rank?'#'+h.rank:'—'}</td><td>${h.champ?'National champions':h.madePO?'Playoff (#'+h.seed+' seed)':h.bowl?esc(h.bowl.name)+(h.bowl.won?' win':' loss'):h.cc?'Conference champions':'—'}</td></tr>`).join('')}</tbody></table></div></div>`:''}`;
}
let LEAGUE_CONF=null;
function hubLeague(){
  const u=T(LG.user);const c=LEAGUE_CONF!=null&&LG.confs[LEAGUE_CONF]?LEAGUE_CONF:u.conf;
  const groups=['FBS','FCS'].map(d=>{const cs=LG.confs.map((x,i)=>[x,i]).filter(([x])=>x.div===d);return cs.length?`<optgroup label="${d}">${cs.map(([x,i])=>`<option value="${i}" ${i===c?'selected':''}>${esc(x.name)} (${LG.teams.filter(t=>t.conf===i).length})</option>`).join('')}</optgroup>`:''}).join('');
  return `<div class="card"><div class="h2">League</div><p class="note">${LG.teams.length} programs in ${LG.confs.length} conferences. Pick a conference to see its standings. Tap Edit to change any school's name, abbreviation or colors.</p>
    <div class="field-row"><label for="leagueConf">Conference</label><select id="leagueConf">${groups}</select></div></div>
  <div class="card"><div class="eyebrow">${esc(confName(c))}${LG.confs[c].ind?'':' standings'}</div><div class="tw"><table><thead><tr><th>Team</th><th class="n">Conf</th><th class="n">All</th><th class="n">OVR</th><th></th></tr></thead><tbody>${confStandings(LG,c).map(t=>`<tr class="${t.id===LG.user?'me':''}"><td>${tcell(t,rankTag(t.id)+teamName(t))}</td><td class="n">${LG.confs[c].ind?'—':t.rec.cw+'–'+t.rec.cl}</td><td class="n">${recStr(t)}</td><td class="n">${teamOvr(t).toFixed(1)}</td><td class="n"><button class="linkbtn" id="edit-${t.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="h2">Team pack</div><p class="note">Rename and recolor the whole league at once, or paste real rosters. Export the current list, edit it, then import it back. Teams are matched by their order in the list.</p>
    <div class="btns"><button class="btn ghost" id="packExport">Export team pack</button><button class="btn ghost" id="packImport">Import team pack</button></div></div>`;
}
function hubSettings(){
  const s=LG.settings;const seg=(id,opts,val)=>`<div class="seg" id="${id}">${opts.map(([v,l])=>`<button data-v="${v}" aria-pressed="${v==val}">${l}</button>`).join('')}</div>`;
  return `<div class="card"><div class="h2">Game settings</div>
    <div class="setrow"><span class="eyebrow">Art style</span>${seg('setS',[['modern','Modern HD'],['retro','Retro pixel']],s.style)}</div>
    <div class="setrow"><span class="eyebrow">Quarter length</span>${seg('setQ',[[120,'2 min'],[180,'3 min'],[300,'5 min']],s.qlen)}</div>
    <div class="setrow"><span class="eyebrow">Difficulty</span>${seg('setD',[[0,'Rookie'],[1,'Varsity'],[2,'All-American'],[3,'Heisman']],s.diff)}</div>
    <div class="setrow"><span class="eyebrow">Sound</span>${seg('setM',[[0,'On'],[1,'Off']],s.muted?1:0)}</div>
    <div class="setrow"><span class="eyebrow">Your program</span><button class="btn sm ghost" id="edit-${LG.user}">Edit name &amp; colors</button></div></div>
  <div class="card"><div class="h2">Saves</div><p class="note">Slot ${SLOT} · autosaves after every snap and every menu action.</p>
    <div class="field-row"><label for="dynRename">Dynasty name</label><input type="text" id="dynRename" maxlength="28" value="${esc(LG.name)}"></div>
    <div class="btns"><button class="btn ghost" id="exportSave">Export save code</button><button class="btn ghost" id="toSlots">Switch save slot</button></div></div>
  <div class="card"><div class="h2">How to play</div><p class="note">
    <b>Pass:</b> after the snap, drag backward from anywhere and release. The circle at the end of the arc shows how accurate your QB is. Tap with a second finger while dragging, or turn on Bullet, for a fast low throw.<br>
    <b>Run:</b> hold above or below your ball carrier to steer. Flick up or down to juke, tap to hurdle, flick forward to dive. Strong runners stiff-arm automatically.<br>
    <b>Kick:</b> tap once to lock the direction, then again to lock the power.<br>
    <b>Clock:</b> college rules. The clock stops briefly after first downs. Use timeouts to save time.</p></div>`;
}
function bindHub(){
  on('playGame',()=>{ac();openPregame(userGameThisWeek())});
  on('simGame',()=>{simUserGame(userGameThisWeek())});
  on('resumeGame',()=>{ac();resumeGame()});
  on('abandonGame',()=>{resumeGame(true)});
  on('advWeek',()=>{finishWeek(LG);saveNow();showHub('home')});
  document.querySelectorAll('#rankDiv button').forEach(b=>b.onclick=()=>{RANK_DIV=b.dataset.v;rerender()});
  const lc=$('#leagueConf');if(lc)lc.onchange=()=>{LEAGUE_CONF=+lc.value;rerender()};
  document.querySelectorAll('#rosChips button').forEach(b=>b.onclick=()=>{ROSTER_FILTER=b.dataset.v;rerender()});
  document.querySelectorAll('[id^="pl-"]').forEach(b=>b.onclick=()=>openPlayer(+b.id.slice(3)));
  document.querySelectorAll('[id^="edit-"]').forEach(b=>b.onclick=()=>openEditor(+b.id.slice(5),()=>{saveNow();rerender()}));
  const seg=(id,f)=>{const e=document.getElementById(id);if(!e)return;e.querySelectorAll('button').forEach(b=>b.onclick=()=>{f(b.dataset.v);saveNow();rerender()})};
  seg('setQ',v=>LG.settings.qlen=+v);seg('setD',v=>LG.settings.diff=+v);seg('setM',v=>{LG.settings.muted=v==='1';muted=LG.settings.muted});seg('setS',v=>{LG.settings.style=v;applyStyle()});
  seg('focusSeg',v=>LG.focus=v);seg('regSeg',v=>LG.regime=v);
  for(const k of ['stadium','training','rehab'])on('fac-'+k,()=>{const c=LG.fac[k]*6;if(LG.credits>=c&&LG.fac[k]<5){LG.credits-=c;LG.fac[k]++;saveNow();rerender();toast('Upgraded')}});
  for(const k of ['oc','dc'])LG.pool[k].forEach((s,i)=>on(`hire-${k}-${i}`,()=>{if(LG.credits<staffCost(s))return;LG.credits-=staffCost(s);const old=LG.staff[k];LG.staff[k]=s;LG.pool[k][i]=old;saveNow();rerender();toast(`${s.name} hired`)}));
  const dr=$('#dynRename');if(dr)dr.onchange=()=>{LG.name=dr.value.trim()||LG.name;saveNow()};
  on('exportSave',()=>{const code=Saves.exportCode(LG);openModal(`<div class="eyebrow">Export save</div><div class="h2">Your save code</div><p class="note">Copy this code and keep it somewhere safe. Paste it into Import save code on the start screen to restore this dynasty, even on another device.</p><textarea id="codeOut" readonly>${esc(code)}</textarea><div class="btns"><button class="btn light" id="codeCopy">Copy</button><button class="btn ghost" id="codeX">Done</button></div>`);
    on('codeX',closeModal);on('codeCopy',()=>{const ta=$('#codeOut');navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(ta.value).then(()=>toast('Copied'),()=>{ta.select();toast('Select all and copy')}):(ta.select(),toast('Select all and copy'))})});
  on('toSlots',()=>{saveNow(true);showSlots()});
  on('packExport',()=>{const pack={conferences:LG.confs.map(c=>c.name),teams:LG.teams.map(t=>({school:t.city,mascot:t.name,abbr:t.abbr,primary:t.c1,secondary:t.c2,prestige:t.prestige,stadium:t.stadium}))};openModal(`<div class="eyebrow">Team pack</div><div class="h2">Export</div><textarea readonly id="packOut">${esc(JSON.stringify(pack,null,1))}</textarea><div class="btns"><button class="btn light" id="packCopy">Copy</button><button class="btn ghost" id="packX">Done</button></div>`);on('packX',closeModal);on('packCopy',()=>{const ta=$('#packOut');ta.select();try{navigator.clipboard.writeText(ta.value).then(()=>toast('Copied'),()=>{})}catch(e){}})});
  on('packImport',()=>openPackImport(LG,()=>{saveNow();showHub();toast('Team pack applied')}));
  // offseason controls
  bindOffseason();
}

/* ---------- modals ---------- */
function openPlayer(id){
  const u=T(LG.user),p=u.roster.find(x=>x.id===id);if(!p)return;
  const render=()=>{
    const s=p.ss,isCap=LG.captains.includes(p.id),startIdx=depth(u,p.pos).indexOf(p);
    openModal(`<div class="eyebrow">${POS_NAME[p.pos]} · #${p.num} · ${yrStr(p)} · ${esc(p.home)}</div><div class="h2" style="font-size:26px">${esc(fullName(p))}</div>
    <div class="setrow"><span>Overall ${starStr(ovr(p))}</span>${p.inj>0?`<span class="tag hot">${esc(p.injWhy)} · out ${p.inj} wk</span>`:''}</div>
    ${PATTR[p.pos].map(k=>{const c=p[k]+1;return `<div class="setrow"><span>${attrName(p.pos,k)} ${starStr(p[k])}</span>${p[k]<5?`<button class="btn sm" id="up-${k}" ${LG.credits<c?'disabled':''}>+1 · ${c} CC</button>`:'<span class="tag gold">Max</span>'}</div>`}).join('')}
    <div class="kv"><span>Condition</span><b>${Math.round(p.cond)}%</b></div>${meterHTML(p.cond)}<div class="kv"><span>XP to next upgrade</span><b>${Math.round(p.xp)}/100</b></div>${meterHTML(p.xp,'var(--los)')}
    <div class="kv"><span>Season</span><b>${esc(statLine(p))}</b></div>
    <div class="btns">${startIdx>0?`<button class="btn sm ghost" id="mkStart">Move to top of depth chart</button>`:''}
      ${p.yr<4&&!p.rs&&s.gp<=4?`<button class="btn sm ghost" id="rsTog">${p.redshirt?'Remove redshirt':'Redshirt this season'}</button>`:''}
      <button class="btn sm ghost" id="capTog">${isCap?'Remove captain':'Name captain'}</button></div>
    <p class="note">Redshirted players sit out but keep a year of eligibility if they play four games or fewer. Captains steady the locker room after losses.</p>
    <button class="btn light wide" id="closeP">Done</button>`);
    PATTR[p.pos].forEach(k=>on('up-'+k,()=>{const c=p[k]+1;if(LG.credits>=c&&p[k]<5){LG.credits-=c;p[k]++;saveNow();render()}}));
    on('mkStart',()=>{u.dco=u.dco||{};const ids=depth(u,p.pos).map(x=>x.id).filter(x=>x!==p.id);u.dco[p.pos]=[p.id,...ids];saveNow();render()});
    on('rsTog',()=>{p.redshirt=!p.redshirt;saveNow();render()});
    on('capTog',()=>{if(isCap)LG.captains=LG.captains.filter(x=>x!==p.id);else{LG.captains.push(p.id);if(LG.captains.length>2)LG.captains.shift()}saveNow();render()});
    on('closeP',()=>{closeModal();rerender()});
  };
  render();
}
function openEditor(id,done,L){
  L=L||LG;const t=L.teams[id];
  openModal(`<div class="eyebrow">Edit program</div><div style="display:flex;gap:12px;align-items:center" id="edPrev">${badge(t,'lg')}<b class="h2">${esc(teamName(t))}</b></div>
    <div class="field-row"><label for="edCity">School</label><input type="text" id="edCity" maxlength="22" value="${esc(t.city)}"></div>
    <div class="field-row"><label for="edName">Mascot</label><input type="text" id="edName" maxlength="16" value="${esc(t.name)}"></div>
    <div class="field-row"><label for="edAbbr">Abbreviation (2–4 letters)</label><input type="text" id="edAbbr" maxlength="4" value="${esc(t.abbr)}" style="text-transform:uppercase"></div>
    <div class="field-row"><label for="edStad">Stadium</label><input type="text" id="edStad" maxlength="30" value="${esc(t.stadium)}"></div>
    <div class="colors"><div class="field-row"><label for="edC1">Primary</label><input type="color" id="edC1" value="${t.c1}"></div><div class="field-row"><label for="edC2">Secondary</label><input type="color" id="edC2" value="${t.c2}"></div></div>
    <div class="btns"><button class="btn light" id="edSave">Save</button><button class="btn ghost" id="edCancel">Cancel</button></div>`);
  const prev=()=>{const tmp={...t,city:$('#edCity').value||t.city,name:$('#edName').value||t.name,abbr:($('#edAbbr').value||t.abbr).toUpperCase(),c1:$('#edC1').value,c2:$('#edC2').value};$('#edPrev').innerHTML=`${badge(tmp,'lg')}<b class="h2">${esc(teamName(tmp))}</b>`};
  ['edCity','edName','edAbbr','edC1','edC2'].forEach(i=>$('#'+i).oninput=prev);
  on('edSave',()=>{t.city=$('#edCity').value.trim()||t.city;t.name=$('#edName').value.trim()||t.name;t.abbr=($('#edAbbr').value.trim()||t.abbr).toUpperCase().slice(0,4);t.stadium=$('#edStad').value.trim()||t.stadium;t.c1=$('#edC1').value;t.c2=$('#edC2').value;closeModal();done&&done()});
  on('edCancel',()=>{closeModal();done&&done()});
}
function openEvent(){
  const e=LG.event;if(!e)return;const ev=EVENTS[e.k],p=T(LG.user).roster.find(x=>x.id===e.pid);if(!p){LG.event=null;return}
  openModal(`<div class="eyebrow">Front office · decision</div><div class="h2">${esc(ev.text(p))}</div><div class="btns">${ev.opts.map((o,i)=>`<button class="btn ${i?'ghost':''}" id="evo-${i}">${esc(o[0])}</button>`).join('')}</div>`);
  ev.opts.forEach((o,i)=>on('evo-'+i,()=>{const msg=o[1](LG,p);LG.fan=clamp(LG.fan,0,100);LG.morale=clamp(LG.morale,0,100);LG.event=null;saveNow();
    openModal(`<div class="eyebrow">Decision made</div><div class="h2">${esc(o[0])}</div><p class="note">${esc(msg)}</p><button class="btn light wide" id="evX">Back to the hub</button>`);on('evX',()=>{closeModal();rerender()})}));
}
function openPregame(g){
  if(!g)return;const u=T(LG.user),opp=T(g.h===LG.user?g.a:g.h),home=g.h===LG.user&&!g.neutral;
  const keys=[];const ol=unitOvr(u,['OL']),odl=unitOvr(opp,['DL']),wr=unitOvr(u,['WR']),ocb=unitOvr(opp,['CB']),olb=unitOvr(opp,['LB']);
  if(odl>ol+.3)keys.push('Their front four can get home. Get the ball out quickly and use bullet passes.');else keys.push('Your line should hold up. Let routes develop and look deep.');
  if(wr>ocb+.2)keys.push('Your receivers have the edge on their corners. Take shots downfield.');else keys.push('Their secondary is sticky. Lead receivers carefully and hit them in stride.');
  if(olb>3.6)keys.push('Their linebackers tackle well. Attack the edges and juke in space.');
  if(g.wx==='Rain')keys.push('Rain makes the ball slick: shorter throws, and protect it.');if(g.wx==='Wind')keys.push('The wind will push deep balls and kicks off line.');if(g.wx==='Snow')keys.push('Snow slows everyone down a step. Lean on the run.');
  if(g.rival)keys.push(`${u.trophy} is on the line.`);
  const watch=[...starters(opp,'QB'),...starters(opp,'WR').slice(0,1),...starters(opp,'DL').slice(0,4).sort((a,b)=>ovr(b)-ovr(a)).slice(0,1)];
  const wp=winProb(u,opp,home?1:g.neutral?0:-1);
  openModal(`<div class="eyebrow">Pregame show · ${esc(LG.weeks[LG.week].label)} · ${esc(g.neutral?'Neutral site':home?u.stadium:opp.stadium)}</div>
    <div class="tags">${gameFlags(LG,g,LG.week).map(([c,l])=>`<span class="tag ${c}">${esc(l)}</span>`).join('')}</div>
    <div class="matchup"><div class="side">${badge(u,'xl')}<b>${rankTag(u.id)}${esc(u.city)}</b><small>${recStr(u)}</small></div><span class="vs">${home||g.neutral?'VS':'AT'}</span><div class="side">${badge(opp,'xl')}<b>${rankTag(opp.id)}${esc(opp.city)}</b><small>${recStr(opp)}</small></div></div>
    <div class="tags"><span class="tag">${WX_ICON[g.wx]} ${g.wx}</span><span class="tag">${g.slot}</span><span class="tag ${wp>=.5?'ok':'hot'}">Win chance ${pct(wp)}</span>${!home&&!g.neutral?'<span class="tag hot">Hostile crowd</span>':''}</div>
    <div><div class="eyebrow" style="margin-bottom:6px">Keys to the game</div><div class="list">${keys.slice(0,3).map(k=>`<div class="lrow"><span>${esc(k)}</span></div>`).join('')}</div></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Players to watch</div><div class="list">${watch.map(p=>`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span>${esc(fullName(p))} · ${esc(opp.city)}</span></span>${starStr(ovr(p))}</div>`).join('')}</div></div>
    <div class="btns"><button class="btn" id="kickoff">Kick off</button><button class="btn ghost" id="pgX">Back</button></div>`,true);
  on('pgX',closeModal);on('kickoff',()=>{closeModal();startUserGame(g)});
}
function simUserGame(g){
  const [hs,as]=simScore(g.h,g.a,g.neutral);g.hs=hs;g.as=as;recordGame(LG,g);const home=g.h===LG.user;const us=home?hs:as,them=home?as:hs;
  const rep=processUserGame(LG,g,{us,them,won:us>them,simmed:true});
  finishWeek(LG);saveNow();showHub('home');toast(`${us>them?'Won':'Lost'} ${us}–${them} · +${rep.cc} CC`);
}

/* ---------- offseason ---------- */
function hubOffseason(){
  const o=LG.off,u=T(LG.user),h=LG.history[LG.history.length-1];
  const steps=['recap','departures','carousel','portal','recruit','signing'];const names={recap:'Season recap',departures:'Departures & draft',carousel:'Coaching carousel',portal:'Transfer portal',recruit:'Recruiting',signing:'Signing day'};
  const prog=`<div class="chips">${steps.map(s=>`<span class="chipbtn" aria-pressed="${o.stage===s}">${names[s]}</span>`).join('')}</div>`;
  if(o.stage==='recap'){
    const a=LG.awards[0];const mine=k=>a[k].filter(x=>x.team===LG.user);
    return `${prog}<div class="card hero"><div class="eyebrow">${h.season} season recap</div><div class="h1">${h.w}–${h.l}</div>
      <div class="tags">${h.rank?`<span class="tag gold">Final rank #${h.rank}</span>`:''}${h.cc?'<span class="tag gold">Conference champions</span>':''}${h.madePO?`<span class="tag gold">Playoff · #${h.seed} seed</span>`:''}${h.bowl?`<span class="tag">${esc(h.bowl.name)} ${h.bowl.won?'win':'loss'}</span>`:''}${h.champ?'<span class="tag gold">National champions</span>':''}</div>
      <p class="note">CFP champion: ${esc(h.champName)}${h.champFName?'. FCS champion: '+esc(h.champFName):''}. Heisman Trophy: ${esc(h.heisman||'—')}${LG.fcsPoy?'. FCS Player of the Year: '+esc(LG.fcsPoy.name):''}.</p></div>
    <div class="grid2"><div class="card"><div class="eyebrow">Athletic director review</div><div class="kv"><span>Expectation</span><b>${o.target}+ wins</b></div><div class="kv"><span>Change in job security</span><b class="${o.delta>=0?'res-w':'res-l'}">${o.delta>=0?'+':''}${o.delta}</b></div>${meterHTML(LG.coach.security)}<p class="note">${LG.coach.security<=10?'The AD has seen enough. Expect to be let go.':LG.coach.security<30?'You are on the hot seat next season.':'Your job is safe.'}</p></div>
      <div class="card"><div class="eyebrow">Your award winners</div><div class="list">${[...mine('allAm').map(x=>[x,'All-American']),...mine('allConf').map(x=>[x,'All-Conference']),...mine('frosh').map(x=>[x,'Freshman All-American'])].map(([x,l])=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span><span class="tag gold">${l}</span></div>`).join('')||'<p class="note">No honorees this year.</p>'}${a.coy===LG.user?'<div class="lrow"><span>You were named Coach of the Year.</span><span class="tag gold">COY</span></div>':''}</div></div></div>
    <button class="btn wide" id="offNext">Continue to departures</button>`;
  }
  if(o.stage==='departures'){const d=o.dep;const li=(arr,f)=>arr.length?arr.map(f).join(''):'<p class="note">None.</p>';
    return `${prog}<div class="grid2"><div class="card"><div class="h2">Graduating seniors</div><div class="list">${li(d.grads,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span>${starStr(x.ovr)}</div>`)}</div></div>
    <div class="card"><div class="h2">Early NFL declarations</div><div class="list">${li(d.declares,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span>${starStr(x.ovr)}</div>`)}</div></div></div>
    <div class="grid2"><div class="card"><div class="h2">Pro draft picks</div><div class="list">${li(d.drafted,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span><span class="tag ${x.round===1?'gold':''}">Round ${x.round} · pick ${x.pick}</span></div>`)}</div><p class="note">Draft picks boost your program's reputation with recruits.</p></div>
    <div class="card"><div class="h2">Entered the transfer portal</div><div class="list">${li(d.portalOut,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span>${starStr(x.ovr)}</div>`)}</div><p class="note">Backups who don't get snaps may leave. Higher morale keeps more of them.</p></div></div>
    <button class="btn wide" id="offNext">Continue</button>`}
  if(o.stage==='carousel'){
    return `${prog}<div class="card hero"><div class="eyebrow">Coaching carousel</div><div class="h2">${o.fired?'You have been fired. These programs want to talk.':'Other programs want to hire you.'}</div><div class="list">${o.offers.map(id=>{const t=T(id);return `<div class="lrow"><span class="l">${badge(t)}<span><b>${esc(teamName(t))}</b><br><small class="note">${confName(t.conf)} · ${starStr(t.prestige)} · OVR ${teamOvr(t).toFixed(1)}</small></span></span><button class="btn sm" id="offer-${id}">Take the job</button></div>`}).join('')}</div>${o.fired?'':'<button class="btn ghost" id="stayPut">Stay at '+esc(u.city)+'</button>'}</div>`;
  }
  if(o.stage==='portal'){
    return `${prog}<div class="card"><div class="setrow"><div class="h2">Transfer portal</div><span class="pill gold">${money(LG.nil)} NIL available</span></div><p class="note">Sign experienced players using your NIL collective. Transfers keep their class year. Roster: ${u.roster.length}/${ROSTER_CAP}.</p>
    <div class="list">${o.portal.map((p,i)=>`<button class="rrow ${p.signed?'sel':''}" id="tp-${i}"><span class="num">${p.pos}</span><span class="meta"><b>${esc(fullName(p))} <small>${yrStr(p)} · from ${esc(T(p.from).city)}</small></b><span class="attrs">${PATTR[p.pos].map(k=>`<span>${attrShort(p.pos,k)} ${starStr(p[k])}</span>`).join('')}</span></span><span class="pill">${p.signed?'Signed':money(portalCost(p))}</span></button>`).join('')}</div>
    <button class="btn wide" id="offNext">Continue to recruiting</button></div>`;
  }
  if(o.stage==='recruit'){
    const spent=sum(o.recruits.filter(r=>r.offered).map(recruitCost)),left=o.rp+o.nilBoost-spent,visits=o.recruits.filter(r=>r.visit).length;
    return `${prog}<div class="card"><div class="setrow"><div class="h2">Recruiting board</div><div class="pills"><span class="pill gold">${left} points left</span><span class="pill">${visits}/3 official visits</span></div></div>
    <p class="note">Offer scholarships with recruiting points (two per star, minus one). Interest is each recruit's chance of signing with you on Signing Day; an official visit adds 20%. Prestige, fan approval and titles raise interest.</p>
    <div class="setrow"><span class="note">Boost your budget with NIL: ${money(150)} per point (${o.nilBoost}/5 used)</span><button class="btn sm ghost" id="nilBoost" ${LG.nil<150||o.nilBoost>=5?'disabled':''}>+1 point</button></div>
    <div class="list">${o.recruits.map((r,i)=>`<div class="rrow ${r.offered?'sel':''}"><span class="num">${r.pos}</span><span class="meta"><b>${esc(fullName(r))} ${starStr(r.stars)}</b><small>${esc(r.home)} · ${PATTR[r.pos].map(k=>attrShort(r.pos,k)+' '+r[k]).join(' · ')}</small><span style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:11px;color:var(--mute)"><span>Interest</span>${meterHTML(r.interest+(r.visit?20:0))}<b>${Math.min(99,r.interest+(r.visit?20:0))}%</b></span></span>
      <span class="btns" style="flex-direction:column;gap:6px"><button class="btn sm ${r.offered?'ghost':''}" id="rof-${i}">${r.offered?'Withdraw':'Offer · '+recruitCost(r)}</button>${r.offered?`<button class="btn sm ghost" id="rvi-${i}" ${!r.visit&&visits>=3?'disabled':''}>${r.visit?'Cancel visit':'Official visit'}</button>`:''}</span></div>`).join('')}</div>
    <button class="btn wide" id="offNext">Go to Signing Day</button></div>`;
  }
  if(o.stage==='signing'){const s=o.signing;
    return `${prog}<div class="card hero"><div class="eyebrow">National Signing Day</div><div class="h1">Class rank #${s.classRank}</div><div class="list">${s.res.map(r=>`<div class="lrow"><span class="l"><span class="num">${r.pos}</span><span>${esc(r.name)} ${starStr(r.stars)}</span></span><span class="tag ${r.ok?'ok':'hot'}">${r.ok?'Signed':'Chose another school'}</span></div>`).join('')||'<p class="note">You made no offers.</p>'}</div>
    <p class="note">Top classes: ${s.top.map(id=>esc(T(id).city)).join(', ')}. Open roster spots will be filled with walk-ons.</p><button class="btn wide" id="offNext">Start the ${LG.season+1} season</button></div>`;
  }
  return '';
}
function bindOffseason(){
  if(LG.phase!=='offseason')return;const o=LG.off;
  on('offNext',()=>{
    if(o.stage==='recap'){departures(LG);o.stage='departures'}
    else if(o.stage==='departures'){jobOffers(LG);if(o.offers.length)o.stage='carousel';else{buildPortal(LG);o.stage='portal'}}
    else if(o.stage==='portal'){buildRecruits(LG);o.stage='recruit'}
    else if(o.stage==='recruit'){signingDay(LG);o.stage='signing'}
    else if(o.stage==='signing'){const camp=startNewSeason(LG);saveNow();showHub('home');$('#hubScroll').scrollTop=0;banner(LG.season+' season','var(--team)');toast(`Camp: ${camp.length} rating upgrades`);return}
    saveNow();showHub('home');$('#hubScroll').scrollTop=0;
  });
  if(o.stage==='carousel'){o.offers.forEach(id=>on('offer-'+id,()=>{takeJob(LG,id);buildPortal(LG);o.stage='portal';saveNow();showHub('home')}));on('stayPut',()=>{buildPortal(LG);o.stage='portal';saveNow();showHub('home')})}
  if(o.stage==='portal')o.portal.forEach((p,i)=>on('tp-'+i,()=>{const u=T(LG.user);const c=portalCost(p);
    if(p.signed){p.signed=false;LG.nil+=c;u.roster=u.roster.filter(x=>x.id!==p.id);const src=T(p.from);if(!src.roster.some(x=>x.id===p.id)&&p.from!==LG.user)src.roster.push(stripPortal(p))}
    else{if(LG.nil<c){toast('Not enough NIL');return}if(u.roster.length>=ROSTER_CAP){toast('Roster is full');return}p.signed=true;LG.nil-=c;const src=T(p.from);src.roster=src.roster.filter(x=>x.id!==p.id);u.roster.push(stripPortal(p));assignNumbers(u)}
    saveNow();rerender()}));
  if(o.stage==='recruit'){
    on('nilBoost',()=>{if(LG.nil>=150&&o.nilBoost<5){LG.nil-=150;o.nilBoost++;saveNow();rerender()}});
    o.recruits.forEach((r,i)=>{on('rof-'+i,()=>{const spent=sum(o.recruits.filter(x=>x.offered).map(recruitCost));if(r.offered){r.offered=false;r.visit=false}else if(spent+recruitCost(r)<=o.rp+o.nilBoost)r.offered=true;else{toast('Not enough points');return}saveNow();rerender()});
      on('rvi-'+i,()=>{const v=o.recruits.filter(x=>x.visit).length;if(r.visit)r.visit=false;else if(v<3)r.visit=true;saveNow();rerender()})});
  }
}
function stripPortal(p){const q={...p};delete q.from;delete q.signed;q.num=0;q.ss=newSS();q.cond=100;q.inj=0;return q}

function openPackImport(L,done,regen){
  openModal(`<div class="eyebrow">Team pack</div><div class="h2">Import a team pack</div>
    <p class="note">Paste a team pack. It can rename all 32 schools, set colors, prestige, stadiums and conference names, and include real rosters. Format: {"conferences":[names in order],"teams":[{"school","mascot","abbr","primary":"#hex","secondary":"#hex","prestige":1-5,"stadium","roster":[{"name","pos","num","yr","ovr"}]}]}. Teams keep their conferences; they are matched by their order in the list.</p>
    <textarea id="packIn" placeholder='{"teams":[...]}'></textarea><p class="note" id="packErr"></p>
    <div class="btns"><button class="btn light" id="packGo">Apply</button><button class="btn ghost" id="packX">Cancel</button></div>`);
  on('packX',closeModal);
  on('packGo',()=>{try{applyTeamPack(L,JSON.parse($('#packIn').value),{regen:regen||L.phase==='regular'&&L.week===0});closeModal();done&&done()}catch(e){$('#packErr').textContent='That doesn’t look like a team pack. Check the brackets, commas and quotes.'}});
}
