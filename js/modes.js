'use strict';
/* ================= match state ================= */
const M={running:false,paused:false,mode:'extract',map:'town',diff:'normal',tod:'day',timeLimit:1200,t:0,left:0,seed:1,net:false,isHost:false,frame:0,alarmT:0,
  stats:{kills:0,heads:0,searched:0,deaths:0,caps:0,score:0,assists:0},tickets:{1:0,2:0},over:false,exT:0,exIdx:-1,heli:null,airdropDone:false,squadT:150,ending:false,
  mut:[],ff:false,pickup:true,killcam:true,countdown:0,score:{1:0,2:0},wave:0,waveT:0,waveState:'idle',relic:null,round:0,rounds:{1:0,2:0},roundT:0,myTeam:1,cfg:null,pstats:{},streak:0,streakT:0};
const COUNT={few:{x:12,c:6,t:4,f:5},mid:{x:20,c:10,t:6,f:7},many:{x:30,c:14,t:9,f:9},max:{x:42,c:18,t:12,f:11}};
const FREE_LOADOUT=lo=>Object.assign({},lo,{helmet:'h2',armor:'a3',rig:'rig1',bag:'bag0',pouch:'pouch2',meds:2,nades:2});
function clearMatchObjects(){clearBots();for(const p of projs)scene.remove(p.m);projs.length=0;for(const d of drones)scene.remove(d.m);drones.length=0;for(const r of rockets)if(r.m)scene.remove(r.m);rockets.length=0;
  if(M.heli){scene.remove(M.heli.g);M.heli=null}rotorSound(false);airdrop=null;if(M.relic&&M.relic.g)scene.remove(M.relic.g);M.relic=null}
function startMatch(cfg){
  M.cfg=cfg;M.mode=cfg.mode;M.map=cfg.map;M.diff=cfg.diff;M.tod=cfg.tod;M.timeLimit=(+cfg.time||20)*60;M.seed=cfg.seed||((Math.random()*1e9)|0);M.net=!!cfg.net;M.isHost=!!cfg.isHost;
  M.mut=cfg.mut||[];M.ff=!!(cfg.room&&cfg.room.ff);M.pickup=!cfg.room||cfg.room.pickup!==false;M.killcam=!cfg.room||cfg.room.killcam!==false;
  M.t=0;M.left=M.timeLimit;M.frame=0;M.alarmT=0;M.over=false;M.ending=false;M.exT=0;M.exIdx=-1;M.airdropDone=false;M.squadT=150*DIFFS[M.diff].squad;
  M.stats={kills:0,heads:0,searched:0,deaths:0,caps:0,score:0,assists:0};M.score={1:0,2:0};M.wave=0;M.waveT=6;M.waveState='prep';M.round=0;M.rounds={1:0,2:0};M.roundT=0;M.pstats={};M.streak=0;
  M.deployed=null;M.result=null;M.heliAuto=false;M.warned=false;M.cqLeft=M.timeLimit;M.bleedT=0;M.countdown=4;
  GRAV=M.mut.includes('lowgrav')?8:20;BIGHEAD=M.mut.includes('bighead');
  clearMatchObjects();
  newWorld(M.map,M.seed,M.mode);applyTOD(M.tod);
  const mode=M.mode,MD=MODES[mode];M.myTeam=cfg.myTeam||1;
  let spawn,lo=PF.loadout,free=mode!=='extract';
  if(mode==='extract'){const sp=W.spawnsP[(cfg.spawnIdx!==undefined?cfg.spawnIdx:(M.seed>>>3))%W.spawnsP.length];spawn={x:sp.x+rnd(-2,2),z:sp.z+rnd(-2,2)};
    M.deployed={weapons:[lo.p1,lo.p2,lo.pistol].filter(Boolean),gear:[['helmet',lo.helmet],['armor',lo.armor],['rig',lo.rig],['bag',lo.bag],['pouch',lo.pouch]]};
    for(const w of M.deployed.weapons)if(!WEAPONS[w].free)addOwn('weapons',w,-1);
    for(const [k,id] of M.deployed.gear)if(GEAR[k][id].price>0)addOwn('gear',id,-1);PF.stats.raids++}
  else if(mode==='conquest'||mode==='tdm'||mode==='relic'){if(mode==='conquest')for(const [x,z,l] of W.flagsPos)flagPole(x,z,l);
    const b=W.basePos[M.myTeam];spawn={x:b.x+rnd(-5,5),z:b.z+rnd(-5,5)};M.tickets={1:+cfg.tickets||200,2:+cfg.tickets||200};lo=FREE_LOADOUT(PF.presets[PF.preset]||PF.loadout);
    if(mode==='relic')makeRelic();if(mode!=='conquest')baseMarkers()}
  else if(mode==='zombie'){const h=W.holdPos;spawn={x:h.x+rnd(-4,4),z:h.z+rnd(-4,4)};lo=FREE_LOADOUT(PF.presets[PF.preset]||PF.loadout);M.myTeam=1}
  else if(mode==='oitc'||mode==='gungame'){spawn=ffaSpawn();lo={pistol:mode==='oitc'?'d50':'p9',helmet:'h0',armor:'a0',rig:'rig1',bag:'bag0',pouch:'pouch2',meds:0,nades:0};M.myTeam=cfg.myTeam||300}
  else if(mode==='duel'){const d=W.duelSpots[0];spawn={x:d.x,z:d.z};lo={pistol:PF.loadout.pistol||'d50',helmet:'h0',armor:'a0',rig:'rig0',bag:'bag0',pouch:'pouch1',meds:0,nades:0};M.myTeam=1}
  spawn.yaw=Math.atan2(spawn.x-(mode==='duel'?W.duelSpots[1].x:0)+(mode==='duel'?0:0),spawn.z-(mode==='duel'?W.duelSpots[1].z:0));
  if(mode!=='duel')spawn.yaw=Math.atan2(spawn.x,spawn.z);
  setupPlayer(lo,spawn,free);P.team=M.myTeam;
  if(mode==='oitc'){const s=P.slots[2];s.mag=1;for(const k in P.ammo)P.ammo[k]=0}
  if(mode==='gungame'){P.gg=0;applyGG()}
  if(mode==='zombie'){for(const k in P.ammo)P.ammo[k]=P.ammoCap[k]}
  savePF();
  if(!M.net||M.isHost){({extract:spawnPveBots,conquest:spawnConquestBots,tdm:spawnTeamBots,relic:spawnTeamBots,zombie:()=>{},oitc:spawnFfaBots,gungame:spawnFfaBots,duel:spawnDuelBots})[mode](cfg)}
  M.running=true;M.paused=false;UI.enterGame();
  if(cfg.fromNet)UI.needClick();else lockPointer();
  banner(MD.name,MD.desc,3.2);blip(330,.2,'triangle',.06);blip(440,.2,'triangle',.06,0,.15)}

/* ---------- spawning ---------- */
function freePointNear(x,z,r,tries=40){for(let i=0;i<tries;i++){const a=Math.random()*TAU,d=Math.random()*r,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;if(isFree(px,pz,.7))return{x:px,z:pz}}return{x,z}}
function ffaSpawn(){let best=null,bs=-1;for(let i=0;i<14;i++){const x=rnd(-W.half*.8,W.half*.8),z=rnd(-W.half*.8,W.half*.8);if(!isFree(x,z,.8))continue;let md=1e9;
  for(const b of bots)if(!b.dead)md=Math.min(md,Math.hypot(b.pos.x-x,b.pos.z-z));if(P&&P.alive)md=Math.min(md,Math.hypot(P.pos.x-x,P.pos.z-z)+(P.team===300?0:0));
  for(const k in netPuppets){const p=netPuppets[k];if(p.alive)md=Math.min(md,Math.hypot(p.pos.x-x,p.pos.z-z))}if(md>bs){bs=md;best={x,z}}}return best||{x:0,z:0}}
function spawnPveBots(cfg){
  const total=Math.round(COUNT[cfg.count||'mid'].x*(W.half/125));const D=DIFFS[M.diff];
  const far=p=>W.spawnsP.every(s=>Math.hypot(s.x-p.x,s.z-p.z)>45);
  if(W.bossSpot){const b=W.bossSpot;makeBot('boss',2,b.x,b.y||0,b.z);for(let i=0;i<3;i++){for(let j=0;j<20;j++){const x=b.x+rnd(-12,12),z=b.z+rnd(-12,12);if(isFree(x,z,.6,b.y||0)){makeBot('grunt',2,x,b.y||0,z);break}}}}
  const roofs=W.roofSpots.filter(r=>r.roof&&far(r)).sort(()=>Math.random()-.5).slice(0,Math.max(2,Math.round(total/7)));
  for(const r of roofs)makeBot('sniper',2,r.x+rnd(-1,1),r.y,r.z+rnd(-1,1));
  const indoor=W.roofSpots.filter(r=>r.indoor&&far(r)).sort(()=>Math.random()-.5).slice(0,Math.round(total/6));
  for(const r of indoor)makeBot('grunt',2,r.x,r.y,r.z);
  const n=total-roofs.length-indoor.length;const spots=W.enemySpots.filter(far).sort(()=>Math.random()-.5);
  for(let i=0;i<n;i++){const s=spots[i%Math.max(1,spots.length)];let p=null;for(let j=0;j<30&&!p;j++){const x=s?s.x+rnd(-10,10):rnd(-W.half+10,W.half-10),z=s?s.z+rnd(-10,10):rnd(-W.half+10,W.half-10);if(isFree(x,z,.7)&&far({x,z}))p={x,z}}
    if(p)makeBot(Math.random()<D.heavy?'heavy':'grunt',2,p.x,0,p.z)}}
function humansOnTeam(t){let n=M.myTeam===t?1:0;if(M.net)for(const id in NET.members)if(id!==NET.myId&&(NET.members[id].team||1)===t)n++;return n}
function spawnConquestBots(cfg){const n=COUNT[cfg.count||'mid'].c;for(const team of [1,2]){const cnt=Math.max(0,n-humansOnTeam(team));for(let i=0;i<cnt;i++)spawnCqBot(team,true)}}
function spawnTeamBots(cfg){const n=COUNT[cfg.count||'mid'].t;for(const team of [1,2]){const cnt=Math.max(0,n-humansOnTeam(team));for(let i=0;i<cnt;i++){const b=W.basePos[team];const p=freePointNear(b.x,b.z,10);
  const bt=makeBot('soldier',team,p.x,0,p.z,{wid:pick(['m7','kv47','v9','k12','d14','l60'])});bt.goalOff=new T.Vector3(rnd(-6,6),0,rnd(-6,6));pickGoal(bt)}}}
function spawnFfaBots(cfg){const n=COUNT[cfg.count||'mid'].f;for(let i=0;i<n;i++){const p=ffaSpawn();const b=makeBot('soldier',400+i,p.x,0,p.z,{wid:M.mode==='oitc'?'d50':GUNGAME[0]});b.gg=0;b.goalOff=new T.Vector3(rnd(-4,4),0,rnd(-4,4));pickGoal(b)}}
function spawnDuelBots(){const n=Math.max(1,1+(M.net?Object.keys(NET.members).length-1:0));const d=W.duelSpots[1];for(let i=0;i<n;i++){const p=freePointNear(d.x,d.z,3);const b=makeBot('gunman',2,p.x,0,p.z,{wid:'d50'});b.static=false;b.duel=true;b.goalOff=new T.Vector3();b.goalT=0}}
function cqSpawnPoint(team){const owned=M.mode==='conquest'?W.flags.filter(f=>f.owner===team):[];const base=W.basePos[team]||{x:0,z:0};const opts=[base,...owned.map(f=>({x:f.x,z:f.z}))];const o=pick(opts);return freePointNear(o.x,o.z,8)}
function spawnCqBot(team,initial){const p=cqSpawnPoint(team);const b=makeBot('soldier',team,p.x,0,p.z,{wid:pick(['m7','kv47','v9','d14','l60'])});b.goalOff=new T.Vector3(rnd(-6,6),0,rnd(-6,6));b.state='patrol';pickGoal(b);return b}
function pickGoal(b){
  if(M.mode==='relic'){const r=M.relic;b.goalT=2;if(!r){b.goal=W.basePos[b.team];return}
    if(r.carrier&&r.carrier.bot===b){b.goal=W.basePos[b.team];b.goalOff.set(0,0,0);return}
    b.goal={x:r.pos.x,z:r.pos.z};b.goalOff.set(rnd(-3,3),0,rnd(-3,3));return}
  if(M.mode==='tdm'||MODES[M.mode].ffa){const ents=hostileEntities(b.team);let best=null,bd=1e9;for(const e of ents){const d=e.pos.distanceTo(b.pos);if(d<bd){bd=d;best=e}}b.goal=best?{x:best.pos.x,z:best.pos.z}:{x:rnd(-40,40),z:rnd(-40,40)};b.goalT=rnd(5,9);return}
  if(M.mode==='duel'){b.goal={x:P.pos.x,z:P.pos.z};b.goalT=3;return}
  if(!W.flags.length){b.goal={x:0,z:0};b.goalT=10;return}
  const fl=W.flags.slice().sort((a,c)=>Math.hypot(a.x-b.pos.x,a.z-b.pos.z)-Math.hypot(c.x-b.pos.x,c.z-b.pos.z));
  const notMine=fl.filter(f=>f.owner!==b.team);b.goal=(notMine.length&&Math.random()<.8)?notMine[Math.random()<.65?0:Math.min(notMine.length-1,1)]:pick(fl);b.goalT=rnd(10,18)}
function reviveBot(b,p){b.dead=false;b.deathT=0;b.hp=b.maxHp;b.g.rotation.z=0;b.pos.set(p.x,0,p.z);b.state='patrol';b.tgt=null;b.seeT=0;b.path=null;b.stunT=0;b.hitBy={};b.mk.visible=false;pickGoal(b)}

/* ---------- relic ---------- */
function makeRelic(){const g=new T.Group();const m=new T.Mesh(new T.IcosahedronGeometry(.45,0),new T.MeshStandardMaterial({color:0xffd34a,emissive:0x8a5a00,roughness:.3,metalness:.7}));g.add(m);
  const glow=new T.Sprite(new T.SpriteMaterial({map:softTex,color:0xffd34a,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));glow.scale.set(3,3,3);g.add(glow);
  const beam=new T.Mesh(new T.CylinderGeometry(.3,.3,60,8,1,true),new T.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:.25,blending:T.AdditiveBlending,depthWrite:false,fog:false}));beam.position.y=30;g.add(beam);
  scene.add(g);M.relic={g,m,pos:new T.Vector3(W.relicPos.x,1,W.relicPos.z),home:new T.Vector3(W.relicPos.x,1,W.relicPos.z),carrier:null,dropT:0}}
function baseMarkers(){for(const t of [1,2]){const b=W.basePos[t];const r=new T.Mesh(new T.RingGeometry(6.6,7,48),new T.MeshBasicMaterial({color:t===1?0x4a8cff:0xff4b3e,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(b.x,.06,b.z);addObj(r)}}
function relicCarrierPos(){const c=M.relic.carrier;if(!c)return null;if(c.me)return P.pos;if(c.bot)return c.bot.pos;if(c.peer&&netPuppets[c.peer])return netPuppets[c.peer].pos;return null}
function updateRelic(dt){const r=M.relic;if(!r)return;r.m.rotation.y+=dt*2;
  const cp=relicCarrierPos();if(cp)r.pos.set(cp.x,cp.y+2.4,cp.z);else if(r.carrier){r.carrier=null}
  r.g.position.copy(r.pos);r.g.children[2].visible=!r.carrier;
  if(M.net&&!M.isHost){if(!r.carrier&&P.alive&&P.pos.distanceTo(r.pos)<2.2&&(!r.touchT||M.t-r.touchT>1)){r.touchT=M.t;netSend({t:'relicTouch'})}
    if(r.carrier&&r.carrier.peer===NET.myId){const b=W.basePos[P.team];if(Math.hypot(P.pos.x-b.x,P.pos.z-b.z)<7&&(!r.capT||M.t-r.capT>2)){r.capT=M.t;netSend({t:'relicCap'})}}return}
  if(!r.carrier){r.dropT-=dt;if(r.dropT<=0&&r.pos.distanceTo(r.home)>1){}
    if(P.alive&&P.pos.distanceTo(r.pos)<2.2)setCarrier({me:true,team:P.team});
    else for(const b of bots)if(!b.dead&&b.pos.distanceTo(_e1.set(r.pos.x,b.pos.y+1,r.pos.z))<2.2){setCarrier({bot:b,team:b.team});break}}
  else{const c=r.carrier;const base=W.basePos[c.team];const p=relicCarrierPos();if(p&&Math.hypot(p.x-base.x,p.z-base.z)<7)relicCapture(c)}}
function setCarrier(c){const r=M.relic;r.carrier=c;const nm=c.me?'你':c.bot?c.bot.name:(NET.members[c.peer]||{}).nick||'隊友';feedAll(`<b>${nm}</b> 拿到聖物`);blip(880,.1,'triangle',.06);for(const b of bots)if(!b.dead)b.goalT=0}
function dropRelic(){const r=M.relic;if(!r||!r.carrier)return;const p=relicCarrierPos();r.carrier=null;if(p)r.pos.set(p.x,1,p.z);r.dropT=20;for(const b of bots)b.goalT=0}
function relicCapture(c){const r=M.relic;M.score[c.team]++;if(c.me){M.stats.caps++;M.stats.score+=500}
  feedAll(`${c.team===M.myTeam?'我方':'敵方'}帶回聖物！ <b>${M.score[1]} : ${M.score[2]}</b>`);banner(c.team===M.myTeam?'得分！':'敵方得分',`${M.score[1]} : ${M.score[2]}`,2);
  r.carrier=null;r.pos.copy(r.home);for(const b of bots)b.goalT=0;if(M.score[c.team]>=5)endTeamMatch(c.team)}

/* ---------- main update ---------- */
function updateMatch(dt){
  M.t+=dt;M.frame++;pathBudget=3;if(M.alarmT>0)M.alarmT=Math.max(0,M.alarmT-dt);if(M.streakT>0){M.streakT-=dt;if(M.streakT<=0)M.streak=0}
  if(M.countdown>0){M.countdown-=dt;UI.countdown(M.countdown);if(M.countdown<=0){UI.countdown(0);banner('開始！','',1);blip(880,.3,'square',.06)}}
  if(M.mode==='extract')M.left-=dt;else M.cqLeft-=dt;
  updatePlayer(dt);updateCamera();if(P.alive)aimAssist(dt);updateWeapon(dt);updateProjs(dt);
  if(!(M.countdown>0))for(const b of bots){updateBot(b,dt);if(!b.puppet&&!b.dead&&M.mode!=='extract'&&b.state!=='combat'){b.goalT-=dt;if(b.goalT<=0||!b.goal)pickGoal(b)}}
  else for(const b of bots)if(b.puppet)updateBot(b,dt);
  for(const d of W.doors){d.anim+=(d.target-d.anim)*Math.min(1,dt*8);d.pivot.rotation.y=d.anim*Math.PI/2*(d.axis==='x'?-1:1)}
  updateDevices(dt);updateBarrels(dt);updateInteract(dt);
  for(const pk of W.pickups)if(!pk.taken)pk.g.rotation.y+=dt;
  ({extract:updateExtraction,conquest:updateConquest,tdm:updateTeamMode,relic:updateTeamMode,zombie:updateZombieMode,oitc:updateFfaMode,gungame:updateFfaMode,duel:updateDuel})[M.mode](dt);
  if(MODES[M.mode].respawn&&!P.alive&&!M.ending)updateRespawnTimer(dt);
  if(typeof netTick==='function')netTick(dt);
}
const respawning=()=>(!M.net||M.isHost);
function updateRespawnTimer(dt){P.respawnT-=dt;UI.respawnTick(P.respawnT)}
function botRespawnTick(dt){if(!respawning())return;for(const b of bots){if(b.dead&&!b.puppet){b.respawnT=(b.respawnT||5)-dt;if(b.respawnT<=0){b.respawnT=5;const p=MODES[M.mode].ffa?ffaSpawn():cqSpawnPoint(b.team);reviveBot(b,p);if(M.mode==='gungame')b.wid=GUNGAME[b.gg]}}}}

/* ---------- extraction ---------- */
function extractOK(e){if(e.type==='nobag')return INV.bag.cap===0;if(e.type==='heli')return M.heli&&M.heli.state==='landed'&&M.heli.at===e;if(e.type==='paid')return e.paid;if(e.type==='power')return W.power;return true}
const EX_TIME={std:8,paid:5,power:8,heli:4,nobag:6};
function updateExtraction(dt){
  const win=M.timeLimit*.45,winEnd=M.timeLimit*.28;
  if(!M.heli&&M.left<win&&M.left>winEnd&&!M.heliAuto){M.heliAuto=true;callHeli(25)}
  updateHeli(dt);
  if(!M.airdropDone&&M.t>M.timeLimit*.3){M.airdropDone=true;startAirdrop()}
  updateAirdrop(dt);
  if(!M.net||M.isHost){M.squadT-=dt;if(M.squadT<=0){M.squadT=rnd(120,160)*DIFFS[M.diff].squad;const tgt=P.alive?P.pos:(Object.values(netPuppets)[0]||{}).pos;if(tgt){const n=spawnSquad(3,tgt,45,70);if(n)banner('偵測到敵方增援部隊','他們正在搜捕你',2.2);if(M.net)netSend({t:'banner',a:'偵測到敵方增援部隊',b:'他們正在搜捕你'})}}}
  if(M.left<=180&&!M.warned){M.warned=true;banner('撤離窗口剩 3 分鐘','',2.4)}
  if(M.left<=0&&P.alive&&!M.ending){endRaid('mia');return}
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
    if(P.alive&&inR(P.pos))(P.team===2?n2++:n1++);for(const k in netPuppets){const p=netPuppets[k];if(p.alive&&inR(p.pos))(p.team===2?n2++:n1++)}
    if(!M.net||M.isHost){for(const b of bots)if(!b.dead&&inR(b.pos))b.team===1?n1++:n2++;
      const before=f.owner;f.v=clamp(f.v+clamp(n1-n2,-3,3)*.09*dt,-1,1);if(f.v>=1)f.owner=1;else if(f.v<=-1)f.owner=2;else if(f.owner===1&&f.v<=0)f.owner=0;else if(f.owner===2&&f.v>=0)f.owner=0;
      if(f.owner!==before&&f.owner){feedAll(`據點 <b>${f.label}</b> 被${f.owner===1?'藍隊':'紅隊'}佔領`);if(f.owner===P.team&&P.alive&&inR(P.pos)){M.stats.caps++;M.stats.score+=200}}}
    f.cloth.material.color.setHex(f.owner===1?0x4a8cff:f.owner===2?0xff4b3e:0xcccccc);f.ring.material.color.setHex(f.owner===1?0x4a8cff:f.owner===2?0xff4b3e:0xffffff);f.inMe=P.alive&&inR(P.pos)}
  if(!M.net||M.isHost){M.bleedT=(M.bleedT||0)+dt;if(M.bleedT>4){M.bleedT=0;const o1=W.flags.filter(f=>f.owner===1).length,o2=W.flags.filter(f=>f.owner===2).length;if(o1>o2)M.tickets[2]-=o1-o2;else if(o2>o1)M.tickets[1]-=o2-o1}
    botRespawnTick(dt);
    if((M.tickets[1]<=0||M.tickets[2]<=0||M.cqLeft<=0)&&!M.ending)endTeamMatch(M.tickets[1]>M.tickets[2]?1:2)}}
/* ---------- TDM / relic ---------- */
function updateTeamMode(dt){if(M.mode==='relic')updateRelic(dt);botRespawnTick(dt);
  if(respawning()&&!M.ending){if(M.mode==='tdm'&&(M.score[1]>=50||M.score[2]>=50))endTeamMatch(M.score[1]>=50?1:2);if(M.cqLeft<=0)endTeamMatch(M.score[1]===M.score[2]?0:M.score[1]>M.score[2]?1:2)}}
/* ---------- FFA ---------- */
function ffaBoard(){const rows=[{name:PF.nick||'你',kills:M.stats.kills,me:true,gg:P.gg||0}];for(const b of bots)rows.push({name:b.name,kills:b.kills,gg:b.gg||0,bot:b});
  for(const k in M.pstats){if(k===NET.myId)continue;const s=M.pstats[k];rows.push({name:(NET.members[k]||{}).nick||'玩家',kills:s.k,gg:s.gg||0,peer:k})}
  return rows.sort((a,b)=>M.mode==='gungame'?b.gg-a.gg||b.kills-a.kills:b.kills-a.kills)}
function updateFfaMode(dt){botRespawnTick(dt);if(!respawning()||M.ending)return;
  if(M.mode==='oitc'){const top=ffaBoard()[0];if(top.kills>=15||M.cqLeft<=0)endFfa(top)}
  else if(M.cqLeft<=0)endFfa(ffaBoard()[0])}
function applyGG(){const wid=GUNGAME[clamp(P.gg,0,GUNGAME.length-1)];for(const s of P.slots)if(s&&s.vm)vmScene.remove(s.vm.g);
  P.slots=[null,null,null,{knife:true,vm:buildKnifeVM()}];if(wid!=='knife'){const sl=makeSlot(wid);const idx=WEAPONS[wid].slot==='pistol'?2:0;P.slots[idx]=sl;P.cur=idx;P.ammo[WEAPONS[wid].ammo]=P.ammoCap[WEAPONS[wid].ammo]}else P.cur=3;
  P.switchT=.42;P.ads=false;if(M.running)buildSlotButtons()}
function ggAdvance(){P.gg++;if(P.gg>=GUNGAME.length){endFfa({me:true,name:PF.nick||'你'});return}applyGG();banner(`升級：${GUNGAME[P.gg]==='knife'?'戰術刀':WEAPONS[GUNGAME[P.gg]].name}`,`${P.gg+1} / ${GUNGAME.length}`,1.4)}
/* ---------- zombie ---------- */
function humansAlive(){let n=P.alive?1:0;for(const k in netPuppets)if(netPuppets[k].alive)n++;return n}
function updateZombieMode(dt){if(!respawning()){return}
  if(M.waveState==='prep'){M.waveT-=dt;if(M.waveT<=0){M.wave++;M.waveState='fight';const n=Math.round((5+M.wave*3)*({few:.7,mid:1,many:1.4,max:1.9}[M.cfg.count||'mid'])*(1+(Object.keys(netPuppets).length)*.4));M.toSpawn=n;M.spawnT=0;
      const msg=[`第 ${M.wave} 波`,M.wave%5===0?'屍暴者來襲！':`${n} 隻喪屍`];banner(...msg,2.4);if(M.net)netSend({t:'banner',a:msg[0],b:msg[1]});blip(110,.8,'sawtooth',.08,-40)}}
  else if(M.waveState==='fight'){M.spawnT-=dt;if(M.toSpawn>0&&M.spawnT<=0&&bots.filter(b=>!b.dead).length<40){M.spawnT=.5;M.toSpawn--;const h=W.holdPos;
      for(let j=0;j<30;j++){const a=Math.random()*TAU,r=rnd(45,85),x=h.x+Math.cos(a)*r,z=h.z+Math.sin(a)*r;if(isFree(x,z,.6)){const brute=(M.wave>=3&&Math.random()<.08+M.wave*.01)||(M.wave%5===0&&M.toSpawn<2);makeBot(brute?'zbrute':'zombie',2,x,0,z);break}}}
    for(let i=bots.length-1;i>=0;i--){const b=bots[i];if(b.dead&&b.deathT>=1){b.gone=(b.gone||0)+dt;if(b.gone>4)removeBot(b)}}
    if(M.toSpawn<=0&&!bots.some(b=>!b.dead)){if(M.wave>=10){endZombie(true);return}M.waveState='prep';M.waveT=12;for(const k in P.ammo)P.ammo[k]=P.ammoCap[k];if(P.alive)P.hp=Math.min(100,P.hp+40);
      banner(`第 ${M.wave} 波結束`,'12 秒後下一波 · 彈藥已補充',2.4);if(M.net)netSend({t:'waveEnd'})}}
  if(humansAlive()===0&&!M.ending&&!(P.downed))endZombie(false)}
/* ---------- duel ---------- */
function updateDuel(dt){if(!respawning())return;
  if(M.roundT>0){M.roundT-=dt;if(M.roundT<=0)startDuelRound();return}
  const meAlive=humansAlive()>0,botAlive=bots.some(b=>!b.dead);
  if(M.round===0){M.round=1;M.countdown=Math.max(M.countdown,3);return}
  if(!meAlive||!botAlive){const w=meAlive?1:2;M.rounds[w]++;const msg=[w===1?'回合勝利':'回合落敗',`${M.rounds[1]} : ${M.rounds[2]}`];banner(...msg,2);if(M.net)netSend({t:'banner',a:msg[0],b:msg[1]});
    if(M.rounds[w]>=5){endDuel(w===1);return}M.roundT=3;M.round++}}
function startDuelRound(){const d=W.duelSpots;for(const b of bots){const p=freePointNear(d[1].x,d[1].z,2);reviveBot(b,p);b.state='combat';b.alertT=99}
  respawnLocal({x:d[0].x,z:d[0].z});const s=P.slots[2];if(s)s.mag=s.st.mag;M.countdown=3;if(M.net)netSend({t:'round',x:d[0].x,z:d[0].z})}

/* ---------- kills / deaths ---------- */
let voiceT=0;function killVoice(txt){if(!PF.settings.killVoice||!window.speechSynthesis)return;try{if(performance.now()-voiceT<500)return;voiceT=performance.now();const u=new SpeechSynthesisUtterance(txt);u.lang='zh-TW';u.rate=1.2;u.volume=PF.settings.vol;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function feedAll(html){feedMsg(html);if(M.net&&M.isHost)netSend({t:'feed',h:html})}
function onBotKilled(b,src,part){
  const head=part==='head';b.deaths++;const how=head?'爆頭':src&&src.how?src.how:'';
  let killerName='';
  if(src&&src.player){killerName=PF.nick||'你';M.stats.kills++;if(head)M.stats.heads++;M.stats.score+=head?150:100;P.ult=Math.min(100,P.ult+12);hitmark('kill');PF.stats.kills++;
    M.streak++;M.streakT=4;killVoice(M.streak>=4?'狂暴殺戮':M.streak===3?'三殺':M.streak===2?'雙殺':head?'爆頭':'擊殺');
    if(M.mode==='oitc'){const s=P.slots[2];if(s)s.mag=Math.min(s.st.mag,s.mag+1);note('+1 發子彈')}
    if(M.mode==='gungame'){const usedKnife=src.how==='刀殺'||src.how==='背刺';if(usedKnife&&b.gg>0){b.gg--;b.wid=GUNGAME[b.gg]}if(GUNGAME[P.gg]==='knife'&&!usedKnife){}else ggAdvance()}
    if(M.mode==='tdm')M.score[P.team]++}
  else if(src&&src.bot){killerName=src.bot.name;src.bot.kills++;if(M.mode==='tdm')M.score[src.bot.team]++;if(M.mode==='gungame'){src.bot.gg++;if(src.bot.gg>=GUNGAME.length)endFfa({name:src.bot.name,bot:src.bot});else src.bot.wid=GUNGAME[src.bot.gg]}}
  else if(src&&src.remote){killerName=(NET.members[src.remote]||{}).nick||'隊友';const ps=M.pstats[src.remote]||(M.pstats[src.remote]={k:0,d:0,gg:0});ps.k++;if(M.mode==='tdm')M.score[(NET.members[src.remote]||{}).team||1]++;if(M.isHost)netSend({t:'kill',to:src.remote,id:b.id,head,how})}
  if(!src||!src.player)if(b.hitBy&&b.hitBy.me&&M.t-b.hitBy.me<6){M.stats.assists++;M.stats.score+=50;note('助攻 +50')}
  if(M.relic&&M.relic.carrier&&M.relic.carrier.bot===b)dropRelic();
  const msg=`${killerName?killerName+' ▸ ':''}<b>${b.name||b.K.name}</b>${how?' · '+how:''}`;if(src&&src.player)feedMsg(msg);else feedAll(msg);
  if(b.kind==='boss')banner('已擊殺指揮官','搜索他的遺體取得機密物資',3);
  if(M.mode==='extract'){b.onDeadDone=bb=>addBody(bb);if(M.pickup&&Math.random()<(b.kind==='heavy'?.5:.22))dropWeapon(b.kind==='heavy'?'l60':pick(['m7','kv47','v9','k12','d14']),b.pos)}
  else if(M.mode==='conquest'){M.tickets[b.team]=Math.max(0,M.tickets[b.team]-1);b.respawnT=5}
  else{b.respawnT=5;if(M.pickup&&b.wid&&b.wid!=='knife'&&M.mode!=='oitc'&&M.mode!=='gungame'&&Math.random()<.35)dropWeapon(b.wid,b.pos,null)}}
function addBody(b){const c={type:'body',bot:b,pos:new T.Vector3(b.pos.x,b.pos.y+.3,b.pos.z),x:b.pos.x,z:b.pos.z,y:b.pos.y+.3,time:b.kind==='boss'?1.6:.9,searched:false,items:null,strip:-1};W.containers.push(c)}
function onPlayerDied(info){M.stats.deaths++;M.streak=0;
  const k=P.lastHit||{};let killer=info&&info.bot||k.src;if(!killer&&k.by&&k.by[0]==='b')killer=bots.find(b=>b.id===+k.by.slice(1))||null;
  if(killer&&!killer.puppet){killer.kills++;if(M.mode==='tdm')M.score[killer.team]++;if(M.mode==='gungame'){killer.gg++;if(killer.gg>=GUNGAME.length){endFfa({name:killer.name,bot:killer});return}killer.wid=GUNGAME[killer.gg]}}
  if(M.net&&!M.isHost)netSend({t:'died',by:killer?('b'+killer.id):(k.by||null)});
  if(killer&&killer.puppet)killer=Object.assign({},killer,{puppet:true});
  if(M.net&&M.isHost&&k.by){const ps=M.pstats[k.by]||(M.pstats[k.by]={k:0,d:0,gg:0});ps.k++;if(M.mode==='tdm')M.score[(NET.members[k.by]||{}).team||1]++;netSend({t:'kill',to:k.by,id:0,head:false,how:''})}
  if(M.mode==='relic'&&M.relic&&M.relic.carrier&&M.relic.carrier.me)dropRelic();
  if(M.mode==='gungame'&&info&&info.melee&&P.gg>0){P.gg--;note('被刀殺，降級')}
  if(M.mode==='conquest')M.tickets[P.team]=Math.max(0,M.tickets[P.team]-1);
  const killerName=killer?killer.name:k.by?((NET.members[k.by]||{}).nick||'敵人'):'';
  if(killerName)feedAll(`${killerName} ▸ <b>${PF.nick||'你'}</b>`);
  if(MODES[M.mode].respawn){P.respawnT=5;unlockPointer();const kp=killer?killer.pos:k.by&&netPuppets[k.by]?netPuppets[k.by].pos:null;
    if(M.killcam&&PF.settings.killcam&&kp)UI.killcam(kp,killerName,killer&&killer.wid?WEAPONS[killer.wid]?WEAPONS[killer.wid].name:'戰術刀':'',()=>UI.respawnOpen5());else UI.respawnOpen5();return}
  if(M.mode==='zombie'||M.mode==='duel')return;
  setTimeout(()=>{if(!M.ending)endRaid('dead')},1600)}
function respawnLocal(at){P.pos.set(at.x,0,at.z);P.alive=true;P.hp=100;P.downed=false;P.vel.set(0,0,0);P.vy=0;P.helmet.dur=P.helmet.max;P.armor.dur=P.armor.max;P.yaw=Math.atan2(at.x,at.z);P.lastHit=null}
function respawnPlayer(at){
  const p=at||(MODES[M.mode].ffa?ffaSpawn():cqSpawnPoint(P.team));respawnLocal(p);
  if(M.mode==='gungame')applyGG();
  else if(M.mode==='oitc'){const s=P.slots[2];if(s)s.mag=1}
  else{const lo=FREE_LOADOUT(PF.presets[PF.preset]||PF.loadout);const keepOp=P.op;for(const s of P.slots)if(s&&s.vm)vmScene.remove(s.vm.g);
    P.slots=MUT('pistolonly')?[null,null,makeSlot(lo.pistol||'p9'),{knife:true,vm:buildKnifeVM()}]:[makeSlot(lo.p1),makeSlot(lo.p2),makeSlot(lo.pistol||'p9'),{knife:true,vm:buildKnifeVM()}];
    P.cur=P.slots[0]?0:P.slots[1]?1:2;for(const k in AMMO)P.ammo[k]=P.ammoCap[k];if(invCount('med')<2)invAdd('med');if(invCount('nade')<2)invAdd('nade');P.op=keepOp;buildSlotButtons()}
  UI.respawnClose();lockPointer()}

/* ---------- endings ---------- */
function endRaid(kind,ex){if(M.ending)return;M.ending=true;
  const res={mode:'extract',kind,map:M.map,time:M.t,kills:M.stats.kills,heads:M.stats.heads,searched:M.stats.searched,items:[],value:0,lost:[]};
  const giveItem=id=>{addOwn('stash',id,1);res.items.push(id);res.value+=ITEMS[id].v};
  if(kind==='win'){for(const k in INV)for(const it of INV[k].items)giveItem(it);
    for(const k in P.ammo)PF.ammo[k]=(PF.ammo[k]||0)+P.ammo[k];for(const s of P.slots)if(s&&s.def)PF.ammo[s.def.ammo]+=s.mag;
    const brought=P.slots.filter(s=>s&&s.def).map(s=>s.wid);for(const w of brought)if(!WEAPONS[w].free)addOwn('weapons',w,1);
    const gained=brought.filter(w=>!M.deployed.weapons.includes(w)&&!WEAPONS[w].free);for(const w of gained){res.items.push('__w_'+w)}
    for(const [k,id] of M.deployed.gear)if(GEAR[k][id].price>0)addOwn('gear',id,1);
    PF.stats.extracts++;PF.stats.best=Math.max(PF.stats.best,res.value)}
  else{for(const it of INV.safe.items)giveItem(it);res.lost=[...P.slots.filter(s=>s&&s.def&&!s.def.free).map(s=>s.def.name),...M.deployed.gear.filter(([k,id])=>GEAR[k][id].price>0).map(([k,id])=>GEAR[k][id].name)];
    for(const k in INV)if(k!=='safe')for(const it of INV[k].items)res.lost.push(ITEMS[it].name)}
  savePF();M.result=res;
  if(M.net&&M.isHost&&Object.keys(netPuppets).some(k=>netPuppets[k].alive)){P.spectate=true;P.alive=false;UI.showResult(res,true);return}
  stopMatch();UI.showResult(res)}
function finishGeneric(res,netMsg){M.ending=true;PF.money+=res.reward;PF.stats.kills;savePF();M.result=res;if(M.net&&M.isHost&&netMsg)netSend(netMsg);stopMatch();UI.showResult(res)}
function endTeamMatch(winTeam){if(M.ending)return;const win=winTeam===P.team;const reward=(win?7000:2500)+M.stats.kills*350+M.stats.caps*600+M.stats.assists*120;
  finishGeneric({mode:M.mode,kind:winTeam===0?'draw':win?'win':'lose',kills:M.stats.kills,deaths:M.stats.deaths,assists:M.stats.assists,caps:M.stats.caps,score:M.stats.score,reward,line:M.mode==='conquest'?`兵力 ${Math.max(0,M.tickets[1])} : ${Math.max(0,M.tickets[2])}`:`比分 ${M.score[1]} : ${M.score[2]}`,time:M.t},{t:'teamEnd',w:winTeam})}
function endFfa(top){if(M.ending)return;const win=!!top.me;const rank=ffaBoard().findIndex(r=>r.me)+1;const reward=(win?8000:2000)+M.stats.kills*300;
  finishGeneric({mode:M.mode,kind:win?'win':'lose',kills:M.stats.kills,deaths:M.stats.deaths,assists:M.stats.assists,reward,line:win?'你是最後的贏家':`冠軍：${top.name} · 你排第 ${rank} 名`,time:M.t},{t:'ffaEnd',n:top.name,peer:top.peer||(top.me?NET.myId:null)})}
function endZombie(win){if(M.ending)return;const reward=M.wave*1500+M.stats.kills*120+(win?10000:0);
  finishGeneric({mode:'zombie',kind:win?'win':'lose',kills:M.stats.kills,deaths:M.stats.deaths,heads:M.stats.heads,reward,line:win?'撐過全部 10 波！':`撐到第 ${M.wave} 波`,time:M.t},{t:'zEnd',win})}
function endDuel(win){if(M.ending)return;const reward=(win?6000:1500)+M.rounds[1]*500;
  finishGeneric({mode:'duel',kind:win?'win':'lose',kills:M.stats.kills,deaths:M.stats.deaths,heads:M.stats.heads,reward,line:`回合 ${M.rounds[1]} : ${M.rounds[2]}`,time:M.t},{t:'duelEnd',win})}
function stopMatch(){M.running=false;M.paused=false;unlockPointer();rotorSound(false);document.body.classList.remove('ingame');if(P)P.slots.forEach(s=>s&&s.vm&&(s.vm.g.visible=false));UI.leaveGame()}
function pauseGame(){if(!M.running||M.paused)return;if(M.net){UI.openPause();M.softPause=true;return}M.paused=true;mouse.l=false;for(const k in keys)keys[k]=false;UI.openPause()}
function resumeGame(){M.paused=false;M.softPause=false;UI.closePause();last=performance.now()}
