'use strict';
/* ================= in-raid UI ================= */
const UI={invOpen:false,mapOpen:false,respawnOpen:false};
let bannerT=0,noteT=0,hitT=0,hitKind='',heartT=0;
function banner(t,sub='',d=2.4){$('banner').innerHTML='';const s=document.createElement('span');s.textContent=t;$('banner').appendChild(s);if(sub){const sm=document.createElement('small');sm.textContent=sub;$('banner').appendChild(sm)}$('banner').style.opacity=1;bannerT=d}
function note(t){$('note').textContent=t;$('note').style.opacity=1;noteT=2.5}
function feedMsg(html){const d=document.createElement('div');d.innerHTML=html;const f=$('feed');f.prepend(d);while(f.children.length>5)f.lastChild.remove();setTimeout(()=>d.remove(),4500)}
function lootToast(lines){const box=$('loot');for(const [t,c,v] of lines){const d=document.createElement('div');const b=document.createElement('b');b.style.color=c;b.textContent=t;d.appendChild(b);if(v){const s=document.createElement('span');s.textContent=v;d.appendChild(s)}box.appendChild(d);setTimeout(()=>d.remove(),3800)}while(box.children.length>9)box.firstChild.remove()}
function hitmark(kind){hitT=kind==='kill'?.45:.18;hitKind=kind;if(kind==='head'){blip(1900,.05,'triangle',.06);blip(2600,.05,'triangle',.04,0,.03)}else if(kind==='kill'){blip(1200,.07,'square',.05);blip(1700,.09,'square',.045,0,.06)}else blip(1500,.03,'triangle',.04)}
const dirs=[];function dmgDir(src){const el=document.createElement('div');el.className='arc';$('dirs').appendChild(el);dirs.push({el,x:src.x,z:src.z,t:1.3});if(dirs.length>6){const o=dirs.shift();o.el.remove()}}
const heading=()=>{let h=(-P.yaw*180/Math.PI)%360;return h<0?h+360:h};
function bearingTo(x,z){let b=Math.atan2(x-P.pos.x,-(z-P.pos.z))*180/Math.PI;return b<0?b+360:b}

UI.enterGame=()=>{$('hub').hidden=true;$('result').hidden=true;$('pause').hidden=true;$('respawn').hidden=true;$('inv').hidden=true;$('bigmap').hidden=true;UI.invOpen=UI.mapOpen=UI.respawnOpen=false;
  $('hud').hidden=false;$('touch').hidden=!isTouch;$('cqBar').hidden=M.mode!=='conquest';$('timerLbl').textContent=M.mode==='conquest'?'剩餘時間':'撤離倒數';$('carryLbl').textContent=M.mode==='conquest'?'分數':'攜帶價值';
  $('feed').innerHTML='';$('loot').innerHTML='';dirs.forEach(d=>d.el.remove());dirs.length=0;
  buildSlotButtons();buildSkillTiles();$('flagChips').innerHTML=W.flags.map((f,i)=>`<span class="flag" id="fc${i}">${f.label}</span>`).join('');
  for(const k in UI._c)delete UI._c[k];if(isTouch)try{document.documentElement.requestFullscreen&&!document.fullscreenElement&&document.documentElement.requestFullscreen().then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch(e){}}).catch(()=>{})}catch(e){}}
UI.leaveGame=()=>{$('hud').hidden=true;$('touch').hidden=true;$('inv').hidden=true;$('bigmap').hidden=true;$('respawn').hidden=true;$('pause').hidden=true;$('vig').style.opacity=0;UI.invOpen=UI.mapOpen=UI.respawnOpen=false}
UI.toHub=()=>{$('result').hidden=true;$('hub').hidden=false;Hub.render()}
UI.scope=b=>{const h=$('scope');if(h.hidden===!b)return;h.hidden=!b};
UI.prompt=(label,prog,tap,t)=>{if(isTouch){const b=$('tUse');b.hidden=!label;if(label){const txt=(prog>0?Math.round(prog*100)+'% · ':'')+label;if(b.textContent!==txt)b.textContent=txt}return}
  const el=$('prompt');el.hidden=!label;if(label){const h=`<kbd>E</kbd>${tap?'按':'按住'} ${label}`;if(el._h!==h){$('promptTxt').innerHTML=h;el._h=h}$('promptBar').style.width=(prog*100)+'%';$('promptBar').parentElement.hidden=tap}};
UI.exfil=(text,prog,ok)=>{const el=$('exfil');el.hidden=!text;if(!text)return;$('exfilTxt').textContent=text;$('exfilTxt').style.color=ok?'var(--exfil)':'var(--amber)';$('exfilBar').style.width=(prog*100)+'%'};
UI.openPause=()=>{$('pause').hidden=false;$('pauseHint').textContent=M.net?'連線中無法暫停，戰鬥仍在進行。':'按「繼續作戰」回到戰場。'};
UI.closePause=()=>{$('pause').hidden=true};
$('resumeBtn').onclick=()=>{initAudio();resumeGame();lockPointer()};
$('abandonBtn').onclick=()=>{$('pause').hidden=true;M.paused=false;if(M.mode==='conquest'){M.ending=true;stopMatch();if(M.net&&M.isHost)netEndForAll();UI.toHub()}else{if(M.net&&M.isHost&&Object.keys(netPuppets).length)netEndForAll();endRaid('abandon');if(M.running){stopMatch();UI.toHub()}}};
// respawn (conquest)
let respChoice=null;
UI.respawnOpen5=()=>{UI.respawnOpen=true;respChoice=null;const el=$('respawn');el.hidden=false;const b=$('respBtns');b.innerHTML='';
  const add=(label,pt)=>{const btn=document.createElement('button');btn.className='ghost';btn.type='button';btn.textContent=label;btn.onclick=()=>{respChoice=pt;[...b.children].forEach(c=>c.style.borderColor='');btn.style.borderColor='var(--amber)';if(P.respawnT<=0)respawnPlayer(pt)};b.appendChild(btn)};
  add('基地',{x:W.basePos[1].x,z:W.basePos[1].z});for(const f of W.flags)if(f.owner===1)add('據點 '+f.label,{x:f.x+rnd(-5,5),z:f.z+rnd(-5,5)})};
UI.respawnTick=t=>{$('respTxt').textContent=t>0?`${Math.ceil(t)} 秒後可以重生 · 選擇重生地點`:'點選重生地點';if(t<=0&&respChoice)respawnPlayer(respChoice);else if(t<=-4)respawnPlayer(null)};
UI.respawnClose=()=>{UI.respawnOpen=false;$('respawn').hidden=true};
// results
UI.showResult=(r,spectate)=>{const el=$('result');el.hidden=false;$('hud').hidden=true;$('touch').hidden=true;$('resItems').innerHTML='';$('resLost').textContent='';
  const st=$('resStats');st.innerHTML='';const stat=(k,v,c)=>{const d=document.createElement('div');d.innerHTML=`<span class="k">${k}</span><strong${c?` style="color:${c}"`:''}>${v}</strong>`;st.appendChild(d)};
  if(r.mode==='conquest'){$('resTitle').textContent=r.kind==='win'?'勝利':'戰敗';$('resTitle').className=r.kind==='win'?'win':'lose';$('resTag').textContent='全面戰場 · '+MAPS[M.map].name;
    $('resSub').textContent=`兵力 ${Math.max(0,r.tickets[1])} : ${Math.max(0,r.tickets[2])}`;stat('擊殺',r.kills);stat('陣亡',r.deaths);stat('佔領',r.caps);stat('獎勵',fmt(r.reward),'var(--amber)')}
  else{const T2={win:['撤離成功','win'],dead:['陣亡','lose'],mia:['未能撤離','lose'],abandon:['放棄任務','lose']}[r.kind];$('resTitle').textContent=T2[0];$('resTitle').className=T2[1];
    $('resTag').textContent=`${MAPS[r.map].name} · 行動時間 ${clock(r.time)}`;
    $('resSub').textContent=r.kind==='win'?'所有攜帶的物品已存入倉庫，到商店可以出售。':'只有保險箱裡的物品被帶回。'+(spectate?' 你是房主，請留在這個畫面讓隊友繼續遊戲。':'');
    stat('擊殺',r.kills);stat('爆頭',r.heads);stat('搜索',r.searched);stat('帶回價值',fmt(r.value),'var(--amber)');
    const cnt={};for(const id of r.items)cnt[id]=(cnt[id]||0)+1;for(const id in cnt){const c=document.createElement('span');c.className='chip';c.style.color=RARITY[ITEMS[id].r];c.textContent=ITEMS[id].name+(cnt[id]>1?' ×'+cnt[id]:'');$('resItems').appendChild(c)}
    if(r.lost&&r.lost.length)$('resLost').textContent='遺失：'+r.lost.slice(0,14).join('、')+(r.lost.length>14?'…':'')}
  $('resHub').textContent=spectate?'結束並返回倉庫':'返回倉庫'};
$('resHub').onclick=()=>{if(M.running){if(M.net&&M.isHost)netEndForAll();stopMatch()}UI.toHub()};
$('resAgain').onclick=()=>{if(M.running){if(M.net&&M.isHost)netEndForAll();stopMatch()}if(M.net){UI.toHub();Hub.tab='net';Hub.render();return}UI.toHub();Hub.tab='deploy';Hub.render()};
const clock=s=>{s=Math.max(0,Math.ceil(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};

/* ---------- inventory ---------- */
function toggleInventory(){if(!M.running)return;UI.invOpen=!UI.invOpen;$('inv').hidden=!UI.invOpen;if(UI.invOpen){unlockPointer();renderInventory()}else lockPointer()}
$('invClose').onclick=()=>toggleInventory();
function renderInventory(){if(!UI.invOpen)return;const g=$('invGrid');g.innerHTML='';$('invVal').textContent=fmt(invValue());
  for(const key of ['safe','pockets','rig','bag']){const c=INV[key];if(key==='bag'&&c.cap===0){const d=document.createElement('div');d.className='ibox';d.innerHTML='<h3>背包<span>未攜帶</span></h3><p class="hint" style="margin:0">沒有背包，可以使用「無背包撤離」點。</p>';g.appendChild(d);continue}
    const box=document.createElement('div');box.className='ibox';const used=invUsed(c);
    box.innerHTML=`<h3>${c.name}<span>${used} / ${c.cap} 格</span></h3><div class="capbar"><div style="width:${c.cap?used/c.cap*100:0}%"></div></div>`;
    c.items.forEach((id,idx)=>{const it=ITEMS[id];const r=document.createElement('div');r.className='irow';const nm=document.createElement('span');nm.style.color=RARITY[it.r];nm.textContent=`${it.name}（${it.s}格）${it.use?'':' '+fmt(it.v)}`;r.appendChild(nm);
      const acts=document.createElement('div');acts.className='acts';const btn=(t,f)=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=()=>{f();renderInventory()};acts.appendChild(b)};
      if(it.use==='med')btn('使用',()=>{c.items.splice(idx,1);c.items.push(id);startHealWith(id)});
      if(it.use==='repair')btn('使用',()=>startRepair());
      if(it.use==='flare')btn('發射',()=>{useFlare();toggleInventory()});
      if(key!=='safe')btn('放保險箱',()=>{if(invFree(INV.safe)>=it.s){c.items.splice(idx,1);INV.safe.items.push(id)}else note('保險箱空間不足')});
      else btn('取出',()=>{c.items.splice(idx,1);if(!invAdd(id)){INV.safe.items.push(id);note('其他空間不足')}});
      btn('丟棄',()=>{c.items.splice(idx,1);dropItem(id)});
      r.appendChild(acts);box.appendChild(r)});
    if(!c.items.length){const p=document.createElement('p');p.className='hint';p.style.margin='0';p.textContent='空';box.appendChild(p)}
    g.appendChild(box)}
  const am=document.createElement('div');am.className='ibox';am.innerHTML='<h3>彈掛<span>彈藥</span></h3>'+Object.keys(AMMO).filter(k=>P.ammo[k]>0||P.slots.some(s=>s&&s.def&&s.def.ammo===k)).map(k=>`<div class="irow"><span>${AMMO[k].name}</span><span style="font-family:var(--f-num)">${P.ammo[k]} / ${P.ammoCap[k]}</span></div>`).join('');g.appendChild(am)}
function startHealWith(id){if(P.healT>0||P.hp>=100)return;invTake(id);P.healItem=id;P.healT=ITEMS[id].time;P.healAmt=ITEMS[id].heal;P.reloadT=0;P.ads=false}
function dropItem(id){const c={type:'drop',pos:new T.Vector3(P.pos.x,P.pos.y+.3,P.pos.z),x:P.pos.x,z:P.pos.z,y:P.pos.y+.3,time:.3,searched:false,items:[{id}],strip:-1};W.containers.push(c);note('已丟棄 '+ITEMS[id].name)}

/* ---------- minimap / big map ---------- */
let mapBase=null,MS=2;
function buildMinimapBase(){MS=600/(W.half*2);mapBase=document.createElement('canvas');mapBase.width=mapBase.height=600;const g=mapBase.getContext('2d');const h=W.half;
  g.fillStyle=THEME.snowy?'#2a2f33':'#1b1d19';g.fillRect(0,0,600,600);
  const bx=b=>[(b.minX+h)*MS,(b.minZ+h)*MS,Math.max(1,(b.maxX-b.minX)*MS),Math.max(1,(b.maxZ-b.minZ)*MS)];
  for(const b of W.boxes){if(!b.solid||b.kind==='door')continue;if(b.minY>2&&b.maxY-b.minY<1){g.fillStyle='rgba(60,60,52,.9)';g.fillRect(...bx(b));continue}}
  for(const b of W.boxes){if(!b.solid||b.minY>2||b.kind==='door')continue;g.fillStyle=b.maxY>2.2?'#a69c86':'#5d5a4e';g.fillRect(...bx(b))}
  if(W.id==='harbor'){g.fillStyle='#1d3a48';g.fillRect((111+h)*MS,0,600,600);g.fillStyle='#4a4f55';g.fillRect((112+h)*MS,(-45+h)*MS,18*MS,90*MS)}}
function toMap(x,z,size){return[(x+W.half)/(W.half*2)*size,(z+W.half)/(W.half*2)*size]}
const EXCOL={std:'#72f5a8',paid:'#ffb547',power:'#ff4b3e',heli:'#9ad0ff',nobag:'#6db5ff'};
const EXNAME={std:'常規撤離',paid:'付費撤離',power:'拉閘撤離',heli:'直升機撤離',nobag:'無背包撤離'};
function toggleBigMap(){if(!M.running)return;UI.mapOpen=!UI.mapOpen;$('bigmap').hidden=!UI.mapOpen;if(UI.mapOpen){unlockPointer();drawBigMap()}else lockPointer()}
$('mapClose').onclick=()=>toggleBigMap();
function drawBigMap(){const c=$('bigmapC'),g=c.getContext('2d'),S=1000;g.clearRect(0,0,S,S);g.drawImage(mapBase,0,0,S,S);g.font='700 22px "Noto Sans TC",sans-serif';g.textAlign='center';
  if(M.mode==='extract'){for(const e of W.extracts){const [x,y]=toMap(e.pos.x,e.pos.z,S);g.fillStyle=EXCOL[e.type];g.globalAlpha=extractOK(e)?1:.45;g.beginPath();g.arc(x,y,13,0,TAU);g.fill();g.globalAlpha=1;g.fillStyle='#efe7d6';g.fillText(e.name,x,y-20)}
    for(const s of W.switches){const [x,y]=toMap(s.pos.x,s.pos.z,S);g.fillStyle=s.on?'#30ff60':'#ffd23a';g.fillRect(x-8,y-8,16,16)}
    if(airdrop){const [x,y]=toMap(airdrop.x,airdrop.z,S);g.strokeStyle='#ff4b3e';g.lineWidth=4;g.beginPath();g.arc(x,y,18,0,TAU);g.stroke();g.fillStyle='#ff4b3e';g.fillText('空投',x,y-24)}}
  else for(const f of W.flags){const [x,y]=toMap(f.x,f.z,S);g.fillStyle=f.owner===1?'#4a8cff':f.owner===2?'#ff4b3e':'#cccccc';g.beginPath();g.arc(x,y,16,0,TAU);g.fill();g.fillStyle='#0d0f0c';g.fillText(f.label,x,y+8)}
  for(const k in netPuppets){const p=netPuppets[k];if(!p.alive)continue;const [x,y]=toMap(p.pos.x,p.pos.z,S);g.fillStyle='#72c8f5';g.beginPath();g.arc(x,y,9,0,TAU);g.fill();g.fillText(p.nick,x,y-14)}
  const [px,py]=toMap(P.pos.x,P.pos.z,S);g.save();g.translate(px,py);g.rotate(heading()*Math.PI/180);g.fillStyle='#ffb547';g.beginPath();g.moveTo(0,-16);g.lineTo(-11,12);g.lineTo(0,6);g.lineTo(11,12);g.closePath();g.fill();g.restore();
  $('mapLegend').innerHTML=M.mode==='extract'?Object.keys(EXNAME).map(k=>`<span><i style="background:${EXCOL[k]}"></i>${EXNAME[k]}</span>`).join('')+'<span><i style="background:#ffd23a;border-radius:0"></i>電閘</span><span>暗色圖示 = 尚未開放</span>':'<span><i style="background:#4a8cff"></i>我方據點</span><span><i style="background:#ff4b3e"></i>敵方據點</span><span><i style="background:#ccc"></i>中立</span>'}

/* ---------- HUD per frame ---------- */
UI._c={};const setT=(id,v)=>{if(UI._c[id]!==v){UI._c[id]=v;$(id).textContent=v}};
const cc=$('compass').getContext('2d'),mc=$('mini').getContext('2d');
const LBL={0:'北',45:'東北',90:'東',135:'東南',180:'南',225:'西南',270:'西',315:'西北'};
function marker(hd,bearing,col,label,ppd,w){let rel=((bearing-hd+540)%360)-180;const x=w/2+clamp(rel,-62,62)*ppd;cc.fillStyle=col;cc.beginPath();cc.moveTo(x,50);cc.lineTo(x-8,62);cc.lineTo(x,74);cc.lineTo(x+8,62);cc.closePath();cc.fill();if(label){cc.font='700 14px "JetBrains Mono",monospace';cc.fillText(label,x+(rel<0?-36:36),62)}}
function drawCompass(){const w=1120,hd=heading(),ppd=w/130;cc.clearRect(0,0,w,88);
  const gr=cc.createLinearGradient(0,0,w,0);gr.addColorStop(0,'rgba(10,12,9,0)');gr.addColorStop(.15,'rgba(10,12,9,.55)');gr.addColorStop(.85,'rgba(10,12,9,.55)');gr.addColorStop(1,'rgba(10,12,9,0)');cc.fillStyle=gr;cc.fillRect(0,0,w,46);
  cc.textAlign='center';cc.textBaseline='middle';
  for(let a=Math.floor((hd-65)/5)*5;a<=hd+65;a+=5){const x=w/2+(a-hd)*ppd,n=((a%360)+360)%360,big=n%45===0,mid=n%15===0;cc.fillStyle=big?'#efe7d6':'rgba(239,231,214,.55)';cc.fillRect(x-1,big?4:mid?8:12,2,big?14:mid?10:6);
    if(big){cc.font='700 22px "Noto Sans TC",sans-serif';cc.fillStyle=n===0?'#ffb547':'#efe7d6';cc.fillText(LBL[n],x,34)}else if(mid){cc.font='500 16px "JetBrains Mono",monospace';cc.fillStyle='rgba(239,231,214,.6)';cc.fillText(n,x,34)}}
  if(M.mode==='extract'){for(const e of W.extracts){if(!extractOK(e))continue;marker(hd,bearingTo(e.pos.x,e.pos.z),EXCOL[e.type],Math.round(Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z))+'m',ppd,w)}
    if(airdrop&&!airdrop.looted)marker(hd,bearingTo(airdrop.x,airdrop.z),'#ff4b3e','空投',ppd,w)}
  else for(const f of W.flags)marker(hd,bearingTo(f.x,f.z),f.owner===1?'#4a8cff':f.owner===2?'#ff4b3e':'#cccccc',f.label,ppd,w);
  for(const k in netPuppets){const p=netPuppets[k];if(p.alive)marker(hd,bearingTo(p.pos.x,p.pos.z),'#72c8f5','',ppd,w)}
  cc.fillStyle='#ffb547';cc.beginPath();cc.moveTo(w/2,52);cc.lineTo(w/2-7,44);cc.lineTo(w/2+7,44);cc.closePath();cc.fill()}
function drawMini(){const s=300,c=s/2,K=2.2;mc.clearRect(0,0,s,s);mc.save();mc.beginPath();mc.arc(c,c,c-2,0,TAU);mc.clip();mc.translate(c,c);mc.rotate(-heading()*Math.PI/180);
  mc.save();mc.scale(K/MS,K/MS);mc.drawImage(mapBase,-(P.pos.x+W.half)*MS,-(P.pos.z+W.half)*MS);mc.restore();
  if(M.mode==='extract')for(const e of W.extracts){mc.fillStyle=EXCOL[e.type];mc.globalAlpha=extractOK(e)?.5:.15;mc.beginPath();mc.arc((e.pos.x-P.pos.x)*K,(e.pos.z-P.pos.z)*K,e.r*K,0,TAU);mc.fill();mc.globalAlpha=1}
  else for(const f of W.flags){mc.fillStyle=f.owner===1?'rgba(74,140,255,.5)':f.owner===2?'rgba(255,75,62,.5)':'rgba(200,200,200,.4)';mc.beginPath();mc.arc((f.x-P.pos.x)*K,(f.z-P.pos.z)*K,f.r*K,0,TAU);mc.fill()}
  for(const b of bots){if(b.dead)continue;const ally=b.team===P.team;if(!ally&&b.spotT<=0&&b.markT<=0&&b.pos.distanceTo(P.pos)>12)continue;mc.fillStyle=ally?'#72c8f5':'#ff4b3e';mc.beginPath();mc.arc((b.pos.x-P.pos.x)*K,(b.pos.z-P.pos.z)*K,b.kind==='boss'?8:5,0,TAU);mc.fill()}
  for(const k in netPuppets){const p=netPuppets[k];if(!p.alive)continue;mc.fillStyle='#72c8f5';mc.beginPath();mc.arc((p.pos.x-P.pos.x)*K,(p.pos.z-P.pos.z)*K,6,0,TAU);mc.fill()}
  mc.restore();mc.fillStyle='#ffb547';mc.beginPath();mc.moveTo(c,c-11);mc.lineTo(c-8,c+8);mc.lineTo(c,c+4);mc.lineTo(c+8,c+8);mc.closePath();mc.fill();
  mc.strokeStyle='rgba(239,231,214,.25)';mc.lineWidth=2;mc.beginPath();mc.arc(c,c,c-2,0,TAU);mc.stroke()}
function buildSlotButtons(){const el=$('slots');el.innerHTML='';P.slots.forEach((s,i)=>{if(!s)return;const b=document.createElement('button');b.type='button';b.dataset.i=i;
  b.innerHTML=`<b>${i+1} ${s.knife?'戰術刀':s.def.name.split(' ')[0]}</b><span></span>`;b.addEventListener('click',()=>switchTo(i));b.addEventListener('touchstart',e=>{e.preventDefault();switchTo(i)},{passive:false});el.appendChild(b)})}
function buildSkillTiles(){const o=OPERATORS[P.op];$('skills').innerHTML=['s1','s2','s3'].map((k,i)=>`<div class="sk" id="sk_${k}"><div class="cd"></div><kbd>${['Q','Z','X'][i]}</kbd><span>${o[k].name}</span></div>`).join('');
  $('tS1').textContent=o.s1.name.slice(0,4);$('tS2').textContent=o.s2.name.slice(0,4);$('tS3').textContent=o.s3.name.slice(0,4)}
function hud(dt){
  const s=curW();
  if(M.mode==='extract'){setT('timer',clock(M.left));$('timer').className=M.left<180?'warn':'';setT('carry',fmt(invValue()))}
  else{setT('timer',clock(M.cqLeft||0));setT('carry',String(M.stats.score));setT('tk1',String(Math.max(0,M.tickets[1])));setT('tk2',String(Math.max(0,M.tickets[2])));
    W.flags.forEach((f,i)=>{const e=$('fc'+i);if(!e)return;const col=f.owner===1?'#4a8cff':f.owner===2?'#ff4b3e':'#888';if(e._c!==col+f.inMe){e._c=col+f.inMe;e.style.borderColor=col;e.style.color=col;e.style.background=f.inMe?'rgba(255,255,255,.12)':''}})}
  setT('kills',`擊殺 ${M.stats.kills} · 爆頭 ${M.stats.heads}`);
  $('hpFill').style.width=P.hp+'%';$('hpFill').style.background=P.hp<35?'var(--danger)':'var(--text)';setT('hpNum',P.downed?'倒地':String(Math.ceil(P.hp)));
  setT('helmT',P.helmet.tier?['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][P.helmet.tier]+' 盔':'頭盔');$('helmFill').style.width=(P.helmet.max?P.helmet.dur/P.helmet.max*100:0)+'%';setT('helmNum',P.helmet.tier?`${Math.ceil(P.helmet.dur)}/${P.helmet.max}`:'—');
  setT('armT',P.armor.tier?['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][P.armor.tier]+' 甲':'護甲');$('armFill').style.width=(P.armor.max?P.armor.dur/P.armor.max*100:0)+'%';setT('armNum',P.armor.tier?`${Math.ceil(P.armor.dur)}/${P.armor.max}`:'—');
  setT('items',`[H] 醫療 ${invCount('med')+invCount('surg')}  [G] 手雷 ${invCount('nade')}  [T] 修甲 ${invCount('repair')}  [F] 手電 ${P.torchOn?'開':'關'}`);
  if(s){if(s.knife){setT('wname','戰術刀');setT('mag','—');setT('res','');setT('wstate','左鍵 揮砍 · 背刺 ×3')}
    else{setT('wname',s.def.name);setT('mag',String(s.mag));setT('res','/ '+P.ammo[s.def.ammo]);$('mag').className=s.mag<=Math.ceil(s.st.mag*.2)?'low':'';
      setT('wstate',P.healT>0?'治療中…':P.repairT>0?'修復護甲中…':P.reloadT>0?'換彈中…':s.mag===0?(P.ammo[s.def.ammo]?(isTouch?'點換彈':'按 R 換彈'):'彈藥耗盡'):(s.def.auto?'全自動':s.def.bolt?'栓動':s.def.pel?'泵動':'半自動')+(P.ads?' · 開鏡':''))}}
  [...$('slots').children].forEach(b=>{const i=+b.dataset.i,x=P.slots[i];b.classList.toggle('on',i===P.cur);const t=x.knife?'近戰':x.mag+' / '+P.ammo[x.def.ammo];if(b.lastChild.textContent!==t)b.lastChild.textContent=t});
  const o=OPERATORS[P.op];for(const k of ['s1','s2','s3']){const el=$('sk_'+k);if(!el)continue;const p=k==='s3'?100-P.ult:P.cd[k]/o[k].cd*100;el.firstChild.style.setProperty('--p',p+'%');el.classList.toggle('ready',p<=0);
    const tb=$('t'+k.toUpperCase());tb.classList.toggle('cd',p>0);tb.classList.toggle('rdy',p<=0)}
  if(isTouch){$('tAds').classList.toggle('on',P.ads);$('tCrouch').classList.toggle('on',P.crouchOn);$('tLight').classList.toggle('on',P.torchOn)}
  const sp=currentSpread(),gap=5+sp*700,xh=$('xh');xh.style.opacity=(1-P.adsK)*(P.sprint?.3:1)*(P.alive?1:0);
  xh.children[0].style.top=(-gap-9)+'px';xh.children[1].style.top=gap+'px';xh.children[2].style.left=(-gap-9)+'px';xh.children[3].style.left=gap+'px';
  hitT-=dt;const hEl=$('hit');hEl.style.opacity=Math.max(0,hitT/.18);hEl.style.color=hitKind==='kill'?'#ff4b3e':hitKind==='head'?'#ffb547':'#efe7d6';hEl.style.transform=`scale(${hitKind==='kill'?1.4:1})`;
  for(let i=dirs.length-1;i>=0;i--){const d=dirs[i];d.t-=dt;if(d.t<=0){d.el.remove();dirs.splice(i,1);continue}d.el.style.transform=`rotate(${bearingTo(d.x,d.z)-heading()}deg)`;d.el.style.opacity=Math.min(1,d.t)}
  const low=clamp((40-P.hp)/40,0,1);$('vig').style.opacity=Math.min(1,low*.75+P.dmgFlash*.8+(!P.alive||P.downed?.6:0));$('blind').style.opacity=Math.min(1,P.blindT/1.5);
  if(low>0&&P.alive){heartT-=dt;if(heartT<=0){heartT=.85-low*.3;blip(55,.12,'sine',.25*low+.05);blip(48,.12,'sine',.2*low+.04,0,.16)}}
  // squad
  const sq=Object.values(netPuppets);const sqh=sq.map(p=>`${p.nick} · ${p.downed?'倒地':p.alive?Math.round(p.hp)+' HP':'陣亡'}`).join('|');if(UI._c.sq!==sqh){UI._c.sq=sqh;$('squad').innerHTML='';for(const p of sq){const d=document.createElement('div');d.textContent=`${p.nick} · ${p.downed?'倒地':p.alive?Math.round(p.hp)+' HP':'陣亡'}`;$('squad').appendChild(d)}}
  if(bannerT>0){bannerT-=dt;if(bannerT<=0)$('banner').style.opacity=0}if(noteT>0){noteT-=dt;if(noteT<=0)$('note').style.opacity=0}
  drawCompass();drawMini();if(UI.mapOpen&&(M.frame%15===0))drawBigMap();if(UI.invOpen&&M.frame%30===0)$('invVal').textContent=fmt(invValue());
}

/* ---------- touch controls ---------- */
(function(){const TS=2.4,stickEl=$('stick'),knob=stickEl.firstElementChild,zone=$('tZone');
  const stickMove=(x,y)=>{let dx=x-touchS.ox,dy=y-touchS.oy;const l=Math.hypot(dx,dy),R=55;if(l>R){dx*=R/l;dy*=R/l}touchS.jx=dx/R;touchS.jy=dy/R;knob.style.transform=`translate(${dx}px,${dy}px)`};
  zone.addEventListener('touchstart',e=>{e.preventDefault();if(!M.running)return;initAudio();for(const t of e.changedTouches){
    if(t.clientX<innerWidth*.42&&touchS.stickId===null){touchS.stickId=t.identifier;touchS.ox=t.clientX;touchS.oy=t.clientY;touchS.jx=touchS.jy=0;stickEl.hidden=false;stickEl.style.left=t.clientX+'px';stickEl.style.top=t.clientY+'px';knob.style.transform=''}
    else if(touchS.lookId===null){touchS.lookId=t.identifier;touchS.lx=t.clientX;touchS.ly=t.clientY}}},{passive:false});
  zone.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===touchS.stickId)stickMove(t.clientX,t.clientY);else if(t.identifier===touchS.lookId){lookDX+=(t.clientX-touchS.lx)*TS;lookDY+=(t.clientY-touchS.ly)*TS;touchS.lx=t.clientX;touchS.ly=t.clientY}}},{passive:false});
  const zEnd=e=>{for(const t of e.changedTouches){if(t.identifier===touchS.stickId){touchS.stickId=null;touchS.jx=touchS.jy=0;stickEl.hidden=true}if(t.identifier===touchS.lookId)touchS.lookId=null}};
  zone.addEventListener('touchend',zEnd);zone.addEventListener('touchcancel',zEnd);
  const tb=(id,down,up)=>{const el=$(id);el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(!M.running||!P)return;initAudio();down&&down(e)},{passive:false});const end=e=>{e.preventDefault();up&&up(e)};el.addEventListener('touchend',end,{passive:false});el.addEventListener('touchcancel',end,{passive:false});return el};
  tb('tReload',()=>startReload());tb('tJump',()=>{keys.Space=true;setTimeout(()=>keys.Space=false,140)});
  tb('tCrouch',()=>{if(P.sprint&&P.onGround&&P.slideT<=0)startSlide();else P.crouchOn=!P.crouchOn});tb('tAds',()=>P.alive&&toggleADS());tb('tKnife',()=>quickMelee());
  tb('tNade',()=>throwNade());tb('tHeal',()=>startHeal());tb('tLight',()=>toggleTorch());tb('tInv',()=>toggleInventory());tb('tMap',()=>toggleBigMap());
  tb('tS1',()=>useSkill('s1'));tb('tS2',()=>useSkill('s2'));tb('tS3',()=>useSkill('s3'));
  tb('tUse',()=>{keys.KeyE=true;tapInteract()},()=>{keys.KeyE=false});tb('tPause',()=>pauseGame());
  const fire=tb('tFire',e=>{const t=e.changedTouches[0];touchS.fireId=t.identifier;touchS.fx=t.clientX;touchS.fy=t.clientY;mouse.l=true;mouse.lPressed=true},()=>{mouse.l=false;touchS.fireId=null});
  fire.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===touchS.fireId){lookDX+=(t.clientX-touchS.fx)*TS;lookDY+=(t.clientY-touchS.fy)*TS;touchS.fx=t.clientX;touchS.fy=t.clientY}},{passive:false});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&M.running)pauseGame()});
})();
