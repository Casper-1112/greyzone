'use strict';
/* ================= match state ================= */
const M={running:false,paused:false,mode:'extract',map:'town',diff:'normal',tod:'day',timeLimit:1200,t:0,left:0,seed:1,net:false,isHost:false,frame:0,alarmT:0,
  stats:{kills:0,heads:0,searched:0,deaths:0,caps:0,score:0},tickets:{1:0,2:0},over:false,exT:0,exIdx:-1,heli:null,airdropDone:false,squadT:150,ending:false};
const COUNT={few:{x:12,c:6},mid:{x:20,c:10},many:{x:30,c:14},max:{x:42,c:18}};
function startMatch(cfg){
  M.mode=cfg.mode;M.map=cfg.map;M.diff=cfg.diff;M.tod=cfg.tod;M.timeLimit=(+cfg.time||20)*60;M.seed=cfg.seed||((Math.random()*1e9)|0);M.net=!!cfg.net;M.isHost=!!cfg.isHost;
  M.t=0;M.left=M.timeLimit;M.frame=0;M.alarmT=0;M.over=false;M.ending=false;M.exT=0;M.exIdx=-1;M.airdropDone=false;M.squadT=150*DIFFS[M.diff].squad;M.stats={kills:0,heads:0,searched:0,deaths:0,caps:0,score:0};
  M.deployed=null;M.result=null;
  clearBots();for(const p of projs)scene.remove(p.m);projs.length=0;for(const d of drones)scene.remove(d.m);drones.length=0;for(const r of rockets)if(r.m)scene.remove(r.m);rockets.length=0;
  if(M.heli){scene.remove(M.heli.g);M.heli=null}rotorSound(false);airdrop=null;M.heliAuto=false;M.warned=false;M.cqLeft=undefined;M.bleedT=0;
  newWorld(M.map,M.seed,M.mode);applyTOD(M.tod);
  const conquest=M.mode==='conquest';let spawn;
  if(conquest){for(const [x,z,l] of W.flagsPos)flagPole(x,z,l);const b=W.basePos[1];spawn={x:b.x+rnd(-4,4),z:b.z+rnd(-4,4)};M.tickets={1:+cfg.tickets||200,2:+cfg.tickets||200}}
  else{const sp=W.spawnsP[(cfg.spawnIdx!==undefined?cfg.spawnIdx:(M.seed>>>3))%W.spawnsP.length];spawn={x:sp.x+rnd(-2,2),z:sp.z+rnd(-2,2)}}
  spawn.yaw=Math.atan2(spawn.x,spawn.z);
  // pay for gear (extraction only)
  if(!conquest){const lo=PF.loadout;M.deployed={weapons:[lo.p1,lo.p2,lo.pistol].filter(Boolean),gear:[['helmet',lo.helmet],['armor',lo.armor],['rig',lo.rig],['bag',lo.bag],['pouch',lo.pouch]]};
    for(const w of M.deployed.weapons)if(!WEAPONS[w].free)addOwn('weapons',w,-1);
    for(const [k,id] of M.deployed.gear)if(GEAR[k][id].price>0)addOwn('gear',id,-1);PF.stats.raids++}
  setupPlayer(conquest?PF.cqLoadout||PF.loadout:PF.loadout,spawn,conquest);savePF();
  if(!M.net||M.isHost){if(conquest)spawnConquestBots(cfg);else spawnPveBots(cfg)}
  M.running=true;M.paused=false;UI.enterGame();lockPointer();
  banner(conquest?'全面戰場':'部署完成',conquest?'佔領據點，耗盡敵方兵力':'搜集物資，找到撤離點',3);
  blip(330,.2,'triangle',.06);blip(440,.2,'triangle',.06,0,.15)}
function spawnPveBots(cfg){
  const total=Math.round(COUNT[cfg.count||'mid'].x*(W.half/125));const D=DIFFS[M.diff];
  const far=p=>W.spawnsP.every(s=>Math.hypot(s.x-p.x,s.z-p.z)>40);
  // boss
  if(W.bossSpot){const b=W.bossSpot;makeBot('boss',2,b.x,b.y||0,b.z);for(let i=0;i<3;i++){for(let j=0;j<20;j++){const x=b.x+rnd(-12,12),z=b.z+rnd(-12,12);if(isFree(x,z,.6,b.y||0)){makeBot('grunt',2,x,b.y||0,z);break}}}}
  // snipers
  const roofs=W.roofSpots.filter(r=>r.roof&&far(r)).sort(()=>Math.random()-.5).slice(0,Math.max(2,Math.round(total/7)));
  for(const r of roofs)makeBot('sniper',2,r.x+rnd(-1,1),r.y,r.z+rnd(-1,1));
  const indoor=W.roofSpots.filter(r=>r.indoor&&far(r)).sort(()=>Math.random()-.5).slice(0,Math.round(total/6));
  for(const r of indoor)makeBot('grunt',2,r.x,r.y,r.z);
  let n=total-roofs.length-indoor.length;const spots=W.enemySpots.filter(far).sort(()=>Math.random()-.5);
  for(let i=0;i<n;i++){const s=spots[i%Math.max(1,spots.length)];let p=null;for(let j=0;j<30&&!p;j++){const x=s?s.x+rnd(-10,10):rnd(-W.half+10,W.half-10),z=s?s.z+rnd(-10,10):rnd(-W.half+10,W.half-10);if(isFree(x,z,.7)&&far({x,z}))p={x,z}}
    if(p)makeBot(Math.random()<D.heavy?'heavy':'grunt',2,p.x,0,p.z)}}
function spawnConquestBots(cfg){const n=COUNT[cfg.count||'mid'].c;const humans=1+(M.net?Object.keys(netPuppets).length:0);
  for(const team of [1,2]){const cnt=team===1?Math.max(0,n-humans):n;for(let i=0;i<cnt;i++)spawnCqBot(team,true)}}
function cqSpawnPoint(team){const owned=W.flags.filter(f=>f.owner===team);const base=W.basePos[team];const opts=[base,...owned.map(f=>({x:f.x,z:f.z}))];const o=pick(opts);
  for(let j=0;j<30;j++){const x=o.x+rnd(-7,7),z=o.z+rnd(-7,7);if(isFree(x,z,.6))return{x,z}}return{x:base.x,z:base.z}}
function spawnCqBot(team,initial){const p=initial?(()=>{const b=W.basePos[team];for(let j=0;j<40;j++){const x=b.x+rnd(-10,10),z=b.z+rnd(-10,10);if(isFree(x,z,.6))return{x,z}}return b})():cqSpawnPoint(team);
  const b=makeBot('soldier',team,p.x,0,p.z);b.goalOff=new T.Vector3(rnd(-6,6),0,rnd(-6,6));b.state='patrol';pickGoal(b);return b}
function pickGoal(b){const fl=W.flags.slice().sort((a,c)=>Math.hypot(a.x-b.pos.x,a.z-b.pos.z)-Math.hypot(c.x-b.pos.x,c.z-b.pos.z));
  const notMine=fl.filter(f=>f.owner!==b.team);b.goal=(notMine.length&&Math.random()<.8)?notMine[Math.random()<.65?0:Math.min(notMine.length-1,1)]:pick(fl);b.goalT=rnd(10,18)}

/* ================= main match update ================= */
function updateMatch(dt){
  M.t+=dt;M.frame++;pathBudget=3;if(M.alarmT>0)M.alarmT=Math.max(0,M.alarmT-dt);
  if(M.mode==='extract')M.left-=dt;
  updatePlayer(dt);updateCamera();if(P.alive)aimAssist(dt);updateWeapon(dt);updateProjs(dt);
  for(const b of bots){updateBot(b,dt);if(M.mode==='conquest'&&!b.puppet&&!b.dead&&b.state!=='combat'){b.goalT-=dt;if(b.goalT<=0||!b.goal)pickGoal(b)}}
  for(const d of W.doors){d.anim+=(d.target-d.anim)*Math.min(1,dt*8);d.pivot.rotation.y=d.anim*Math.PI/2*(d.axis==='x'?-1:1)}
  updateDevices(dt);updateBarrels(dt);updateInteract(dt);
  if(M.mode==='extract')updateExtraction(dt);else updateConquest(dt);
  if(typeof netTick==='function')netTick(dt);
}
/* ---------- extraction ---------- */
function extractOK(e){if(e.type==='nobag')return INV.bag.cap===0;if(e.type==='heli')return M.heli&&M.heli.state==='landed'&&M.heli.at===e;if(e.type==='paid')return e.paid;if(e.type==='power')return W.power;return true}
const EX_TIME={std:8,paid:5,power:8,heli:4,nobag:6};
function updateExtraction(dt){
  // heli schedule
  const win=M.timeLimit*.45,winEnd=M.timeLimit*.28;
  if(!M.heli&&M.left<win&&M.left>winEnd&&!M.heliAuto){M.heliAuto=true;callHeli(25)}
  updateHeli(dt);
  // airdrop
  if(!M.airdropDone&&M.t>M.timeLimit*.3){M.airdropDone=true;startAirdrop()}
  updateAirdrop(dt);
  // reinforcements
  if(!M.net||M.isHost){M.squadT-=dt;if(M.squadT<=0){M.squadT=rnd(120,160)*DIFFS[M.diff].squad;const tgt=P.alive?P.pos:(Object.values(netPuppets)[0]||{}).pos;if(tgt){const n=spawnSquad(3,tgt,45,70);if(n)banner('偵測到敵方增援部隊','他們正在搜捕你',2.2);if(M.net)netSend({t:'banner',a:'偵測到敵方增援部隊',b:'他們正在搜捕你'})}}}
  if(M.left<=180&&!M.warned){M.warned=true;banner('撤離窗口剩 3 分鐘','',2.4)}
  if(M.left<=0&&P.alive&&!M.ending){endRaid('mia');return}
  // extraction zones
  let inIdx=-1;W.extracts.forEach((e,i)=>{e.ring.material.opacity=(extractOK(e)?.55:.18)+.3*Math.sin(M.t*4);e.beam.material.opacity=extractOK(e)?.22:.06;
    if(P.alive&&!P.downed&&Math.hypot(P.pos.x-e.pos.x,P.pos.z-e.pos.z)<e.r)inIdx=i});
  if(inIdx>=0){const e=W.extracts[inIdx];if(!e.triggered){e.triggered=true;if(!M.net||M.isHost){const n=spawnSquad(3,e.pos,30,48);if(n)banner('敵方追兵逼近撤離點','',1.8)}else netSend({t:'exTrig',x:e.pos.x,z:e.pos.z})}
    if(extractOK(e)){M.exT+=dt;const need=EX_TIME[e.type];UI.exfil(`${e.name} · 撤離中 ${Math.max(0,need-M.exT).toFixed(1)} 秒`,M.exT/need,true);if(M.exT>=need&&!M.ending)endRaid('win',e)}
    else{M.exT=0;UI.exfil(e.type==='nobag'?'需要卸下背包才能從這裡撤離':e.type==='paid'?`按住 E 支付 ${fmt(e.cost)} 啟用`:e.type==='power'?'需要先找到電閘恢復電力':'直升機尚未抵達（使用信號彈呼叫，或等待開放時段）',0,false)}}
  else{M.exT=Math.max(0,M.exT-dt*2);UI.exfil(null)}}
function callHeli(delay){const pads=W.extracts.filter(e=>e.type==='heli');if(!pads.length)return;const at=pads[0];
  const g=new T.Group();const body=new T.Mesh(new T.BoxGeometry(2.6,2.2,7),MAT.dark);body.position.y=1.4;g.add(body);const tail=new T.Mesh(new T.BoxGeometry(.6,.6,6),MAT.dark);tail.position.set(0,1.9,-6);g.add(tail);
  const rotor=new T.Mesh(new T.BoxGeometry(14,.08,.5),MAT.metal);rotor.position.y=2.75;g.add(rotor);const r2=rotor.clone();r2.rotation.y=Math.PI/2;rotor.add(r2);
  for(const s of [-1,1]){const sk=new T.Mesh(new T.BoxGeometry(.15,.15,5),MAT.metal);sk.position.set(s*1.3,.1,0);g.add(sk)}
  g.position.set(at.pos.x+200,80,at.pos.z);scene.add(g);M.heli={g,rotor,at,state:'inbound',t:delay,stay:45};at.active=true;banner('直升機出發',`${Math.round(delay)} 秒後抵達 ${at.name}`,2.4)}
function updateHeli(dt){const h=M.heli;if(!h)return;h.rotor.rotation.y+=dt*25;const tp=h.at.pos;
  const dc=camera.position.distanceTo(h.g.position);rotorSound(dc<220,clamp(.35-dc/700,.02,.3));
  if(h.state==='inbound'){h.t-=dt;const k=clamp(1-h.t/25,0,1);h.g.position.set(tp.x+200*(1-k),lerp(80,.2,k*k),tp.z);if(h.t<=0){h.state='landed';h.t=h.stay;banner('直升機已降落',h.at.name+' · 盡快登機',2.2)}}
  else if(h.state==='landed'){h.t-=dt;h.g.position.set(tp.x,.2,tp.z);if(h.t<=0){h.state='leaving';h.t=8}}
  else if(h.state==='leaving'){h.t-=dt;h.g.position.y+=dt*12;h.g.position.x-=dt*20;if(h.t<=0){scene.remove(h.g);M.heli=null;rotorSound(false);h.at.active=false}}}
function useFlare(){if(M.mode!=='extract')return;if(M.heli){note('直升機已在途中');return}if(!invTake('flare'))return;
  emit(new T.Vector3(P.pos.x,P.pos.y+2,P.pos.z),30,'red',6,2,.1,-3);puff(P.pos,8,3,6,0xff4b3e,.6);callHeli(30);if(M.net)netSend({t:'heli'})}
let airdrop=null;
function startAirdrop(){const R=mulberry(M.seed+77);let x=0,z=0;for(let i=0;i<50;i++){x=(R()-.5)*W.half*1.1;z=(R()-.5)*W.half*1.1;if(isFree(x,z,1.5))break}
  const m=new T.Mesh(new T.BoxGeometry(1.6,1.2,1.6),MAT.cR);m.position.set(x,90,z);scene.add(m);W.meshes.push(m);
  const chute=new T.Mesh(new T.SphereGeometry(3,12,8,0,TAU,0,Math.PI/2),new T.MeshStandardMaterial({color:0xd8d0bf,side:T.DoubleSide}));chute.position.y=4;m.add(chute);
  airdrop={m,chute,x,z,landed:false};banner('空投補給降落中','高價值物資 · 敵人也在前往',2.6);if(!M.net||M.isHost){const n=spawnSquad(4,{x,z},8,20);for(const b of bots.slice(-n)){b.lastSeen.set(x,0,z);b.state='combat';b.alertT=60}}}
function updateAirdrop(dt){if(!airdrop||airdrop.landed)return;const m=airdrop.m;m.position.y-=dt*7;if(Math.random()<dt*6)puff(new T.Vector3(airdrop.x,0,airdrop.z),1,3,5,0xff4b3e,.5,1,2);
  if(m.position.y<=.6){airdrop.landed=true;m.remove(airdrop.chute);m.visible=false;lootBox(airdrop.x,airdrop.z,'airdrop');W.stripMesh.instanceMatrix.needsUpdate=true;W.stripMesh.instanceColor.needsUpdate=true}}

/* ---------- conquest ---------- */
function updateConquest(dt){
  for(const f of W.flags){let n1=0,n2=0;const inR=(p)=>Math.hypot(p.x-f.x,p.z-f.z)<f.r;
    if(P.alive&&inR(P.pos))n1++;for(const k in netPuppets){const p=netPuppets[k];if(p.alive&&inR(p.pos))(p.team===2?n2++:n1++)}
    if(!M.net||M.isHost){for(const b of bots)if(!b.dead&&inR(b.pos))b.team===1?n1++:n2++;
      const before=f.owner;f.v=clamp(f.v+clamp(n1-n2,-3,3)*.09*dt,-1,1);if(f.v>=1)f.owner=1;else if(f.v<=-1)f.owner=2;else if(f.owner===1&&f.v<=0)f.owner=0;else if(f.owner===2&&f.v>=0)f.owner=0;
      if(f.owner!==before&&f.owner){feedMsg(`據點 <b>${f.label}</b> 被${f.owner===1?'我方':'敵方'}佔領`);if(f.owner===1&&P.alive&&inR(P.pos)){M.stats.caps++;M.stats.score+=200}}}
    f.cloth.material.color.setHex(f.owner===1?0x4a8cff:f.owner===2?0xff4b3e:0xcccccc);f.ring.material.color.setHex(f.owner===1?0x4a8cff:f.owner===2?0xff4b3e:0xffffff);f.inMe=P.alive&&inR(P.pos)}
  if(!M.net||M.isHost){M.bleedT=(M.bleedT||0)+dt;if(M.bleedT>4){M.bleedT=0;const o1=W.flags.filter(f=>f.owner===1).length,o2=W.flags.filter(f=>f.owner===2).length;if(o1>o2)M.tickets[2]-=o1-o2;else if(o2>o1)M.tickets[1]-=o2-o1}
    for(const b of bots){if(b.dead&&!b.puppet){b.respawnT=(b.respawnT||5)-dt;if(b.respawnT<=0){removeBot(b);spawnCqBot(b.team,false);break}}}
    M.cqLeft=(M.cqLeft===undefined?M.timeLimit:M.cqLeft)-dt;
    if((M.tickets[1]<=0||M.tickets[2]<=0||M.cqLeft<=0)&&!M.ending)endConquest(M.tickets[1]>M.tickets[2])}
  if(!P.alive&&!M.ending){P.respawnT=(P.respawnT||0)-dt;UI.respawnTick(P.respawnT)}}
function respawnPlayer(at){const p=at||cqSpawnPoint(1);P.pos.set(p.x,0,p.z);P.alive=true;P.hp=100;P.downed=false;P.helmet.dur=P.helmet.max;P.armor.dur=P.armor.max;
  for(const s of P.slots)if(s&&s.st){s.mag=s.st.mag}for(const k in AMMO)P.ammo[k]=P.ammoCap[k];if(invCount('med')<2)invAdd('med');if(invCount('nade')<2)invAdd('nade');P.yaw=Math.atan2(p.x,p.z);UI.respawnClose();lockPointer()}

/* ---------- kills / deaths ---------- */
function onBotKilled(b,src,part){
  const head=part==='head';const by=src&&src.player?'你':src&&src.bot?(src.bot.team===1?'友軍':'敵軍'):'';
  if(src&&src.player){M.stats.kills++;if(head)M.stats.heads++;M.stats.score+=head?150:100;P.ult=Math.min(100,P.ult+12);hitmark('kill');PF.stats.kills++}
  if(src&&src.remote&&M.isHost)netSend({t:'kill',to:src.remote,id:b.id,head});
  if(M.mode==='extract'||b.team===2||by)feedMsg(`${by?by+' ▸ ':''}<b>${b.K.name}</b>${head?' · 爆頭':src&&src.how?` · ${src.how}`:''}`);
  if(b.kind==='boss')banner('已擊殺指揮官','搜索他的遺體取得機密物資',3);
  if(M.mode==='extract')b.onDeadDone=bb=>addBody(bb);
  else{M.tickets[b.team]=Math.max(0,M.tickets[b.team]-1);b.respawnT=5}}
function addBody(b){const c={type:'body',bot:b,pos:new T.Vector3(b.pos.x,b.pos.y+.3,b.pos.z),x:b.pos.x,z:b.pos.z,y:b.pos.y+.3,time:b.kind==='boss'?1.6:.9,searched:false,items:null,strip:-1};W.containers.push(c)}
function onPlayerDied(info){M.stats.deaths++;
  if(M.mode==='conquest'){M.tickets[1]=Math.max(0,M.tickets[1]-1);P.respawnT=5;unlockPointer();UI.respawnOpen5();return}
  setTimeout(()=>{if(!M.ending)endRaid('dead')},1600)}
function endRaid(kind,ex){if(M.ending)return;M.ending=true;
  const lo=PF.loadout;const res={mode:'extract',kind,map:M.map,time:M.t,kills:M.stats.kills,heads:M.stats.heads,searched:M.stats.searched,items:[],value:0,lost:[]};
  const giveItem=id=>{addOwn('stash',id,1);res.items.push(id);res.value+=ITEMS[id].v};
  if(kind==='win'){for(const k in INV)for(const it of INV[k].items)giveItem(it);
    for(const k in P.ammo)PF.ammo[k]=(PF.ammo[k]||0)+P.ammo[k];for(const s of P.slots)if(s&&s.def)PF.ammo[s.def.ammo]+=s.mag;
    for(const w of M.deployed.weapons)if(!WEAPONS[w].free)addOwn('weapons',w,1);for(const [k,id] of M.deployed.gear)if(GEAR[k][id].price>0)addOwn('gear',id,1);
    PF.stats.extracts++;PF.stats.best=Math.max(PF.stats.best,res.value)}
  else{for(const it of INV.safe.items)giveItem(it);res.lost=[...M.deployed.weapons.filter(w=>!WEAPONS[w].free).map(w=>WEAPONS[w].name),...M.deployed.gear.filter(([k,id])=>GEAR[k][id].price>0).map(([k,id])=>GEAR[k][id].name)];
    for(const k in INV)if(k!=='safe')for(const it of INV[k].items)res.lost.push(ITEMS[it].name)}
  savePF();M.result=res;
  if(M.net&&M.isHost&&Object.keys(netPuppets).length){P.spectate=true;P.alive=false;UI.showResult(res,true);return}
  stopMatch();UI.showResult(res)}
function endConquest(win){M.ending=true;const reward=(win?8000:3000)+M.stats.kills*400+M.stats.caps*600;PF.money+=reward;savePF();
  const res={mode:'conquest',kind:win?'win':'lose',kills:M.stats.kills,deaths:M.stats.deaths,caps:M.stats.caps,score:M.stats.score,reward,tickets:{...M.tickets},time:M.t};M.result=res;
  if(M.net&&M.isHost)netSend({t:'cqEnd',win});stopMatch();UI.showResult(res)}
function stopMatch(){M.running=false;M.paused=false;unlockPointer();rotorSound(false);if(P)P.slots.forEach(s=>s&&s.vm&&(s.vm.g.visible=false));UI.leaveGame()}
function pauseGame(){if(!M.running||M.paused)return;if(M.net){UI.openPause();M.paused=false;M.softPause=true;return}M.paused=true;mouse.l=false;for(const k in keys)keys[k]=false;UI.openPause()}
function resumeGame(){M.paused=false;M.softPause=false;UI.closePause();last=performance.now()}
