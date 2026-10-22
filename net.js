'use strict';
/* ================= multiplayer (WebRTC via PeerJS; BroadcastChannel mock with ?mocknet) ================= */
let netPuppets={};
const NET={tp:null,myId:null,code:null,isHost:false,members:{},sendT:0,snapT:0,hostId:null,status:'idle',annT:0};
const PREFIX='greyzone2-';
const MOCK=location.search.includes('mocknet');
function netAvailable(){const h=location.hostname;if(/claude\.ai$|claudeusercontent|anthropic/.test(h))return{ok:false,why:'Claude 作品頁不支援點對點連線。請到 GitHub Pages 版本開房。'};
  if(!window.RTCPeerConnection&&!MOCK)return{ok:false,why:'這個瀏覽器不支援 WebRTC 連線。'};
  if(!window.Peer&&!MOCK)return{ok:false,why:'連線元件載入失敗，請檢查網路後重新整理。'};return{ok:true}}
function makePeerTransport(){const t={conns:{},on:{}};
  function addConn(c){c.on('open',()=>{t.conns[c.peer]=c;t.on.conn&&t.on.conn(c.peer)});c.on('data',d=>t.on.data&&t.on.data(c.peer,d));c.on('close',()=>{delete t.conns[c.peer];t.on.close&&t.on.close(c.peer)});c.on('error',()=>{})}
  function wire(){t.peer.on('open',id=>{t.on.open&&t.on.open(id)});t.peer.on('connection',c=>addConn(c));t.peer.on('error',e=>t.on.error&&t.on.error(e.type||String(e)));t.peer.on('disconnected',()=>{try{t.peer.reconnect()}catch(e){}})}
  t.host=code=>{t.peer=new Peer(PREFIX+code,{debug:0});wire()};
  t.join=code=>{t.peer=new Peer({debug:0});wire();t.peer.on('open',()=>{const c=t.peer.connect(PREFIX+code,{serialization:'json',reliable:true});addConn(c);setTimeout(()=>{if(!Object.keys(t.conns).length)t.on.error&&t.on.error('peer-unavailable')},10000)})};
  t.send=(id,m)=>{const c=t.conns[id];if(c&&c.open)try{c.send(m)}catch(e){}};t.bcast=m=>{for(const id in t.conns)t.send(id,m)};
  t.close=()=>{try{t.peer&&t.peer.destroy()}catch(e){}t.conns={}};return t}
function makeBCTransport(){const t={conns:{},on:{}};const me='p'+Math.random().toString(36).slice(2,8);let bc=null,room=null;
  const post=(to,m)=>bc.postMessage({room,from:me,to,m});
  t.host=code=>{room=code;bc=new BroadcastChannel('gzmock');bc.onmessage=ev=>{const d=ev.data;if(d.room!==room||d.to!==me&&d.to!=='*')return;if(d.m&&d.m.__hello){t.conns[d.from]=1;post(d.from,{__ack:1});t.on.conn&&t.on.conn(d.from);return}if(d.m&&d.m.__bye){delete t.conns[d.from];t.on.close&&t.on.close(d.from);return}t.on.data&&t.on.data(d.from,d.m)};setTimeout(()=>t.on.open&&t.on.open(me),50)};
  t.join=code=>{room=code;bc=new BroadcastChannel('gzmock');bc.onmessage=ev=>{const d=ev.data;if(d.room!==room||d.to!==me)return;if(d.m&&d.m.__ack){t.conns[d.from]=1;t.on.conn&&t.on.conn(d.from);return}if(d.m&&d.m.__bye){delete t.conns[d.from];t.on.close&&t.on.close(d.from);return}t.on.data&&t.on.data(d.from,d.m)};setTimeout(()=>{t.on.open&&t.on.open(me);post('*',{__hello:1})},50)};
  t.send=(id,m)=>post(id,m);t.bcast=m=>{for(const id in t.conns)post(id,m)};t.close=()=>{if(bc){for(const id in t.conns)post(id,{__bye:1});bc.close()}};addEventListener('beforeunload',()=>t.close());return t}
function netCreate(asHost,code){netLeave();const av=netAvailable();if(!av.ok){UI.netStatus(av.why,true);return}
  NET.tp=MOCK?makeBCTransport():makePeerTransport();NET.isHost=asHost;NET.code=code;NET.members={};NET.status='connecting';const t=NET.tp;
  t.on.open=id=>{NET.myId=id;if(asHost){NET.hostId=id;NET.members[id]={nick:PF.nick||'房主',op:PF.operator,host:true,team:1};NET.status='hosting';UI.netStatus(`房間已建立：${code}`);UI.netLobby();pubAnnounce()}else UI.netStatus('正在連線到房間…')};
  t.on.conn=id=>{if(asHost)UI.netStatus(`房間 ${code}：有人加入`);else{NET.hostId=id;NET.status='joined';t.send(id,{t:'hello',nick:PF.nick||'玩家',op:PF.operator});UI.netStatus(`已加入房間 ${code}`)}};
  t.on.data=(id,m)=>{try{netOnData(id,m)}catch(e){console.error(e)}};
  t.on.close=id=>{if(asHost){delete NET.members[id];removePuppet(id);netBroadcastLobby();UI.netLobby()}else{UI.netStatus('與房主的連線中斷',true);NET.status='idle';if(M.running&&M.net){stopMatch();UI.toHub();banner('房主已離開','',2)}}};
  t.on.error=e=>{UI.netStatus(e==='unavailable-id'?'房號已被使用，換一個試試':e==='peer-unavailable'?'找不到這個房間，確認房號是否正確':e==='network'||e==='server-error'?'連不上配對伺服器，請檢查網路':'連線錯誤：'+e,true)};
  asHost?t.host(code):t.join(code)}
function netLeave(){if(NET.tp){NET.tp.close();NET.tp=null}NET.status='idle';NET.members={};for(const k in netPuppets)removePuppet(k)}
function netSend(m){if(!NET.tp||!M.net)return;if(NET.isHost){m.from=m.from||NET.myId;NET.tp.bcast(m)}else NET.tp.send(NET.hostId,m)}
function netBroadcastLobby(){if(!NET.isHost||!NET.tp)return;NET.tp.bcast({t:'lobby',members:NET.members,host:NET.myId,set:lobbySettings()})}
function lobbySettings(){const s=PF.settings;return{mode:s.mode,map:s.map,diff:s.diff,tod:s.tod,time:s.time,count:s.count,mut:s.mut,ff:s.ff,pickup:s.pickup}}
function netSetTeam(team){if(NET.isHost){NET.members[NET.myId].team=team;netBroadcastLobby();UI.netLobby()}else if(NET.tp)NET.tp.send(NET.hostId,{t:'team',team})}
function netStartGame(cfg){if(!NET.isHost)return;const ids=Object.keys(NET.members).sort();cfg.teams={};ids.forEach((id,i)=>cfg.teams[id]=MODES[cfg.mode].ffa?300+i:MODES[cfg.mode].team?(NET.members[id].team||1):1);
  cfg.room={ff:!!PF.settings.ff,pickup:PF.settings.pickup!==false,killcam:PF.settings.killcam!==false};
  NET.tp.bcast({t:'start',cfg});M.pstats={};startMatch(Object.assign({},cfg,{net:true,isHost:true,myTeam:cfg.teams[NET.myId]}));for(const id of ids)if(id!==NET.myId){ensurePuppet(id).team=cfg.teams[id]}}
/* ---------- puppets ---------- */
const nameTag=(txt,col)=>{const c=document.createElement('canvas');c.width=256;c.height=48;const g=c.getContext('2d');g.font='700 26px "Noto Sans TC",sans-serif';g.textAlign='center';g.fillStyle='rgba(10,12,9,.6)';g.fillRect(28,6,200,36);g.fillStyle=col;g.fillText(String(txt).slice(0,10),128,33);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(1.6,.3,1);s.position.y=2.25;s.renderOrder=11;return s};
function ensurePuppet(id){if(netPuppets[id])return netPuppets[id];if(!_legGeo)_legGeo=new T.BoxGeometry(.2,.9,.22).translate(0,-.45,0);
  const team=(M.cfg&&M.cfg.teams&&M.cfg.teams[id])||1;const ally=team===M.myTeam&&!MODES[M.mode].ffa;
  const g=new T.Group();const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.85});const up=new T.Mesh(botGeo('soldier',team===2?2:team===1?1:team),mat);up.castShadow=true;g.add(up);
  const lm=new T.MeshStandardMaterial({color:0x34404a});const legL=new T.Mesh(_legGeo,lm);legL.position.set(-.13,.9,0);g.add(legL);const legR=new T.Mesh(_legGeo,lm);legR.position.set(.13,.9,0);g.add(legR);
  const nm=(NET.members[id]&&NET.members[id].nick)||'玩家';const tag=nameTag(nm,ally?'#72c8f5':'#ff6b5e');g.add(tag);tag.visible=ally;scene.add(g);
  return netPuppets[id]={id,g,mat,legL,legR,tag,pos:g.position,yaw:0,pitch:0,team,alive:true,downed:false,crouch:false,speed:0,torch:false,nick:nm,net:{x:0,y:0,z:0,yaw:0},fs:0,anim:0,hp:100,flash:0}}
function removePuppet(id){const p=netPuppets[id];if(!p)return;scene.remove(p.g);delete netPuppets[id]}
function updatePuppets(dt){for(const k in netPuppets){const p=netPuppets[k],n=p.net,a=Math.min(1,dt*12);p.pos.x=lerp(p.pos.x,n.x,a);p.pos.y=lerp(p.pos.y,n.y,a);p.pos.z=lerp(p.pos.z,n.z,a);p.yaw+=angDiff(n.yaw,p.yaw)*a;
  p.g.rotation.y=p.yaw+Math.PI;p.g.visible=p.alive;p.g.rotation.z=p.downed?1.3:0;p.g.scale.y=p.crouch?.7:1;p.anim+=dt*(p.speed||0)*3.3;const sw=p.speed>.4?Math.sin(p.anim)*.6:0;p.legL.rotation.x=sw;p.legR.rotation.x=-sw;
  if(p.flash>0){p.flash-=dt;p.mat.emissive.setRGB(1,1,1)}else p.mat.emissive.setRGB(0,0,0)}}
function myState(){return{x:+P.pos.x.toFixed(2),y:+P.pos.y.toFixed(2),z:+P.pos.z.toFixed(2),yw:+P.yaw.toFixed(3),pt:+P.pitch.toFixed(3),cr:P.crouch>.5?1:0,al:P.alive&&!P.spectate?1:0,dn:P.downed?1:0,fs:P.fireSeq||0,sp:+P.speed.toFixed(1),tc:P.torchOn?1:0,hp:Math.round(P.hp),k:M.stats.kills,d:M.stats.deaths,gg:P.gg||0}}
function applyPlayerState(id,s){const p=ensurePuppet(id);p.net.x=s.x;p.net.y=s.y;p.net.z=s.z;p.net.yaw=s.yw;p.pitch=s.pt;p.crouch=!!s.cr;p.alive=!!s.al;p.downed=!!s.dn;p.speed=s.sp;p.torch=!!s.tc;p.hp=s.hp;
  if(M.isHost){const ps=M.pstats[id]||(M.pstats[id]={k:0,d:0,gg:0});ps.k=Math.max(ps.k,s.k||0);ps.d=Math.max(ps.d,s.d||0);ps.gg=s.gg||0}
  if(s.fs>p.fs&&p.alive){const n=Math.min(3,s.fs-p.fs);for(let i=0;i<n;i++){const dir=new T.Vector3(-Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch));const muz=new T.Vector3(p.pos.x,p.pos.y+1.4,p.pos.z).addScaledVector(dir,.8);
    const end=rayWorld(muz,dir,120)?muz.clone().addScaledVector(dir,RH.t):muz.clone().addScaledVector(dir,120);tracer(muz,end,0x9ad0ff,.025);worldFlash(muz);const dc=camera.position.distanceTo(p.pos);gunSnd(clamp(1-dc/140,.04,1)*.4,900,.2,dc<30?100:0,panTo(p.pos.x,p.pos.z))}}
  p.fs=s.fs}
/* ---------- messages ---------- */
function creditKill(peer,head,how){if(peer===NET.myId){M.stats.kills++;if(head)M.stats.heads++;M.stats.score+=head?150:100;P.ult=Math.min(100,P.ult+12);hitmark('kill');afterKillLocal()}else NET.tp.send(peer,{t:'kill',head,how})}
function afterKillLocal(){M.streak++;M.streakT=4;killVoice(M.streak>=4?'狂暴殺戮':M.streak===3?'三殺':M.streak===2?'雙殺':'擊殺');if(M.mode==='oitc'){const s=P.slots[2];if(s)s.mag=Math.min(s.st.mag,s.mag+1)}if(M.mode==='gungame')ggAdvance()}
function netOnData(from,m){if(!m||!m.t)return;
  if(NET.isHost){
    switch(m.t){
    case 'hello':NET.members[from]={nick:String(m.nick||'玩家').slice(0,12),op:m.op,team:Object.values(NET.members).filter(x=>x.team===1).length>Object.values(NET.members).filter(x=>x.team===2).length?2:1};netBroadcastLobby();UI.netLobby();if(M.running&&M.net)NET.tp.send(from,{t:'busy'});pubAnnounce();return;
    case 'team':if(NET.members[from]){NET.members[from].team=m.team===2?2:1;netBroadcastLobby();UI.netLobby()}return;
    case 's':if(M.running)applyPlayerState(from,m.s);return;
    case 'hit':{const b=bots.find(x=>x.id===m.id);const pp=netPuppets[from];if(b&&!b.dead)damageBot(b,+m.dmg||0,m.part,{remote:from,pos:pp?pp.pos:null,how:m.how},null);return}
    case 'php':{const pp=netPuppets[from];const src=pp?pp.pos:new T.Vector3();if(m.to===NET.myId)damagePlayer(+m.dmg,src,{head:m.head,by:from});else NET.tp.send(m.to,{t:'dmg',amt:+m.dmg,x:src.x,z:src.z,head:m.head,by:from});if(netPuppets[m.to])netPuppets[m.to].flash=.07;return}
    case 'died':{const ps=M.pstats[from]||(M.pstats[from]={k:0,d:0,gg:0});ps.d++;const nm=(NET.members[from]||{}).nick||'玩家';let kn='';
      if(m.by&&m.by[0]==='b'){const b=bots.find(x=>x.id===+m.by.slice(1));if(b){b.kills++;kn=b.name;if(M.mode==='tdm')M.score[b.team]++;if(M.mode==='gungame'){b.gg++;if(b.gg>=GUNGAME.length)endFfa({name:b.name,bot:b});else b.wid=GUNGAME[b.gg]}}}
      else if(m.by){const kp=M.pstats[m.by]||(M.pstats[m.by]={k:0,d:0,gg:0});kp.k++;kn=(NET.members[m.by]||{}).nick||(m.by===NET.myId?PF.nick:'玩家');if(M.mode==='tdm')M.score[(M.cfg.teams||{})[m.by]||1]++;creditKill(m.by,false,'')}
      if(M.relic&&M.relic.carrier&&M.relic.carrier.peer===from)dropRelic();if(M.mode==='conquest')M.tickets[(M.cfg.teams||{})[from]||1]--;
      feedAll(`${kn?kn+' ▸ ':''}<b>${nm}</b>`);return}
    case 'chat':{const msg={t:'chat',n:(NET.members[from]||{}).nick||'玩家',m:String(m.m).slice(0,80)};NET.tp.bcast(msg);UI.chatLine(msg.n,msg.m);return}
    case 'relicTouch':if(M.relic&&!M.relic.carrier){const pp=netPuppets[from];if(pp&&pp.pos.distanceTo(M.relic.pos)<3.5)setCarrier({peer:from,team:(M.cfg.teams||{})[from]||1})}return;
    case 'relicCap':if(M.relic&&M.relic.carrier&&M.relic.carrier.peer===from)relicCapture(M.relic.carrier);return;
    case 'alarm':M.alarmT=30;alertNoise(new T.Vector3(m.x,0,m.z),90,new T.Vector3(m.x,0,m.z));spawnSquad(3,{x:m.x,z:m.z},40,60);return;
    case 'exTrig':spawnSquad(3,{x:m.x,z:m.z},30,48);return;
    case 'stun':{const b=bots.find(x=>x.id===m.id);if(b)b.stunT=3.5;return}
    case 'revive':if(m.to===NET.myId)revivePlayer();else NET.tp.send(m.to,{t:'revive'});return;
    }
    m.from=from;for(const id in NET.tp.conns)if(id!==from)NET.tp.send(id,m);netApplyShared(m);return}
  switch(m.t){
  case 'lobby':NET.members=m.members;NET.hostId=m.host;NET.hostSet=m.set;UI.netLobby();return;
  case 'start':M.pstats={};startMatch(Object.assign({},m.cfg,{net:true,isHost:false,fromNet:true,myTeam:(m.cfg.teams||{})[NET.myId]||1}));for(const id in NET.members)if(id!==NET.myId)ensurePuppet(id);return;
  case 'busy':UI.netStatus('房間正在遊戲中，請等這局結束',true);return;
  case 'w':if(M.running)applySnapshot(m);return;
  case 'dmg':if(M.running)damagePlayer(m.amt,new T.Vector3(m.x,0,m.z),{head:m.head,by:m.by});return;
  case 'kill':if(M.running){M.stats.kills++;if(m.head)M.stats.heads++;M.stats.score+=m.head?150:100;P.ult=Math.min(100,P.ult+12);hitmark('kill');PF.stats.kills++;afterKillLocal()}return;
  case 'revive':revivePlayer();return;
  case 'banner':banner(m.a,m.b||'',2.2);return;
  case 'feed':feedMsg(m.h);return;
  case 'chat':UI.chatLine(m.n,m.m);return;
  case 'waveEnd':for(const k in P.ammo)P.ammo[k]=P.ammoCap[k];if(P.alive)P.hp=Math.min(100,P.hp+40);return;
  case 'round':respawnLocal({x:m.x+rnd(-2,2),z:m.z+rnd(-2,2)});{const s=P.slots[2];if(s)s.mag=s.st.mag}M.countdown=3;return;
  case 'teamEnd':if(M.running&&!M.ending)endTeamMatch(m.w);return;
  case 'ffaEnd':if(M.running&&!M.ending)endFfa(m.peer===NET.myId?{me:true,name:PF.nick}:{name:m.n});return;
  case 'zEnd':if(M.running&&!M.ending)endZombie(m.win);return;
  case 'duelEnd':if(M.running&&!M.ending)endDuel(m.win);return;
  case 'end':if(M.running){stopMatch();UI.toHub();banner('房主結束了這局','',2)}return;
  }
  netApplyShared(m)}
function netApplyShared(m){if(!M.running)return;switch(m.t){
  case 'proj':spawnRemoteProj(m);break;case 'skill':doSkill(m.id,false,m);break;case 'rockets':doSkill('bulwark.s3',false,{tx:m.x,tz:m.z,x:m.x,y:0,z:m.z});break;
  case 'door':{const d=W.doors[m.i];if(d&&d.open!==m.o){d.open=m.o;d.target=m.o?1:0;d.box.off=m.o}break}
  case 'unlock':{const d=W.doors[m.i];if(d)d.locked=null;break}case 'power':activatePower();break;case 'heli':if(!M.heli)callHeli(30);break;}}
/* ---------- host snapshot ---------- */
function makeSnapshot(){const b=[];for(const x of bots){if(x.puppet)continue;b.push([x.id,KIND_IDX.indexOf(x.kind),x.team,+x.pos.x.toFixed(2),+x.pos.y.toFixed(2),+x.pos.z.toFixed(2),+x.yaw.toFixed(2),Math.round(x.hp/x.maxHp*100),(x.dead?1:0)|(x.stunT>0?2:0),x.fireSeq,
    x.tgt?(x.tgt.local?NET.myId:x.tgt.remote!==undefined?x.tgt.remote:x.tgt.bot?x.tgt.bot.id:0):0,x.kills,x.deaths,x.wid?Object.keys(WEAPONS).indexOf(x.wid):-1,x.gg||0])}
  const p={};p[NET.myId]=myState();for(const k in netPuppets){const q=netPuppets[k];p[k]={x:q.net.x,y:q.net.y,z:q.net.z,yw:q.net.yaw,pt:q.pitch,cr:q.crouch?1:0,al:q.alive?1:0,dn:q.downed?1:0,fs:q.fs,sp:q.speed,tc:q.torch?1:0,hp:q.hp}}
  const r=M.relic;let rel=null;if(r){const c=r.carrier;rel=[+r.pos.x.toFixed(1),+r.pos.y.toFixed(1),+r.pos.z.toFixed(1),c?(c.me?NET.myId:c.peer?c.peer:'b'+c.bot.id):0]}
  M.pstats[NET.myId]={k:M.stats.kills,d:M.stats.deaths,gg:P.gg||0};
  return{t:'w',b,p,fl:W.flags.map(f=>[+f.v.toFixed(3),f.owner]),tk:[M.tickets[1],M.tickets[2]],sc:[M.score[1],M.score[2]],L:M.left,cq:M.cqLeft,wv:M.wave,rl:rel,rd:[M.rounds[1],M.rounds[2]],ps:M.pstats,cd:M.countdown}}
const WKEYS=Object.keys(WEAPONS);
function applySnapshot(s){const seen=new Set();
  for(const a of s.b){const [id,ki,team,x,y,z,yaw,hp,fl,fs,tgt,kills,deaths,wi,gg]=a;seen.add(id);let b=bots.find(q=>q.id===id);
    if(!b){b=makeBot(KIND_IDX[ki]||'grunt',team,x,y,z,{id,puppet:true});b.fireSeq=fs}
    const sp=Math.hypot(x-b.net.x,z-b.net.z)/.066;b.net.x=x;b.net.y=y;b.net.z=z;b.net.yaw=yaw;b.net.spd=Math.min(6,sp);b.hp=hp/100*b.maxHp;b.stunT=fl&2?1:0;b.kills=kills;b.deaths=deaths;b.wid=wi>=0?WKEYS[wi]:null;b.gg=gg;
    if((fl&1)&&!b.dead){b.dead=true;b.deathT=0;if(M.mode==='extract')b.onDeadDone=bb=>addBody(bb)}
    else if(!(fl&1)&&b.dead&&M.mode!=='extract'){b.dead=false;b.g.rotation.z=0;b.pos.set(x,y,z)}
    if(fs>b.fireSeq&&!b.dead){b.fireSeq=fs;let aim=null;if(tgt===NET.myId)aim=new T.Vector3(P.pos.x+rnd(-.8,.8),P.pos.y+P.eyeH()-.3+rnd(-.4,.4),P.pos.z+rnd(-.8,.8));else if(netPuppets[tgt])aim=netPuppets[tgt].pos.clone().setY(netPuppets[tgt].pos.y+1.3);else{const tb=bots.find(q=>q.id===tgt);if(tb)aim=tb.pos.clone().setY(tb.pos.y+1.3)}
      if(aim&&!b.K.melee){const muz=botMuzzle(b,new T.Vector3()).clone();shotFX(b,muz,aim,0)}}}
  for(const b of bots.slice())if(b.puppet&&!seen.has(b.id))removeBot(b);
  for(const id in s.p){if(id===NET.myId)continue;applyPlayerState(id,s.p[id])}
  for(const k in netPuppets)if(!s.p[k])removePuppet(k);
  s.fl.forEach((f,i)=>{const F=W.flags[i];if(F){F.v=f[0];F.owner=f[1]}});M.tickets[1]=s.tk[0];M.tickets[2]=s.tk[1];M.score[1]=s.sc[0];M.score[2]=s.sc[1];M.wave=s.wv;M.rounds[1]=s.rd[0];M.rounds[2]=s.rd[1];M.pstats=s.ps||{};
  if(M.mode!=='extract')M.cqLeft=s.cq;if(s.cd>0&&!(M.countdown>0))M.countdown=s.cd;
  if(s.rl&&M.relic){M.relic.pos.set(s.rl[0],s.rl[1],s.rl[2]);const c=s.rl[3];M.relic.carrier=!c?null:c===NET.myId?{me:true,team:P.team}:c[0]==='b'?{bot:bots.find(q=>q.id===+c.slice(1)),team:0}:{peer:c,team:0};if(M.relic.carrier&&M.relic.carrier.bot===undefined&&c[0]==='b')M.relic.carrier=null}}
function netTick(dt){if(!M.net||!NET.tp)return;updatePuppets(dt);
  if(NET.isHost){NET.snapT-=dt;if(NET.snapT<=0){NET.snapT=.066;NET.tp.bcast(makeSnapshot())}}
  else{NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=.05;NET.tp.send(NET.hostId,{t:'s',s:myState()})}}}
function netReportHit(id,dmg,part){if(!NET.isHost)NET.tp&&NET.tp.send(NET.hostId,{t:'hit',id,dmg:Math.round(dmg),part})}
function netDamageRemote(peer,dmg,srcPos,head,by){if(NET.isHost&&NET.tp)NET.tp.send(peer,{t:'dmg',amt:+dmg.toFixed(1),x:srcPos.x,z:srcPos.z,head,by})}
function netHitPlayer(ent,dmg,part){if(!M.net||!ent||!ent.id)return;const head=part==='head';if(MUT('headonly')&&!head)return;if(M.mode==='oitc')dmg=999;if(MUT('hardcore'))dmg*=3;ent.flash=.07;
  if(NET.isHost)NET.tp.send(ent.id,{t:'dmg',amt:+dmg.toFixed(1),x:P.pos.x,z:P.pos.z,head,by:NET.myId});else NET.tp.send(NET.hostId,{t:'php',to:ent.id,dmg:+dmg.toFixed(1),head})}
function netEndForAll(){if(NET.isHost&&NET.tp)NET.tp.bcast({t:'end'})}
function netChat(text){text=String(text).trim().slice(0,80);if(!text||!NET.tp)return;if(NET.isHost){const msg={t:'chat',n:PF.nick||'房主',m:text};NET.tp.bcast(msg);UI.chatLine(msg.n,msg.m)}else NET.tp.send(NET.hostId,{t:'chat',m:text})}
function inviteLink(){return location.origin+location.pathname+'?join='+NET.code}
/* ---------- public room registry (best effort, peer-hosted) ---------- */
const LOBBY_ID=PREFIX+'lobby-v1';const PUB={reg:null,rooms:{},cli:null};
function pubBecomeRegistry(onFail){if(MOCK||!window.Peer)return onFail&&onFail();try{const p=new Peer(LOBBY_ID,{debug:0});
  p.on('open',()=>{PUB.reg=p});p.on('connection',c=>{c.on('data',d=>{if(!d)return;if(d.t==='ann'&&d.room&&d.room.code){PUB.rooms[d.room.code]=Object.assign({},d.room,{ts:Date.now()})}else if(d.t==='unann'){delete PUB.rooms[d.code]}else if(d.t==='list'){pubPrune();try{c.send({t:'rooms',list:Object.values(PUB.rooms)})}catch(e){}}})});
  p.on('error',e=>{try{p.destroy()}catch(x){}PUB.reg=null;onFail&&onFail(e.type)})}catch(e){onFail&&onFail()}}
function pubPrune(){const now=Date.now();for(const k in PUB.rooms)if(now-PUB.rooms[k].ts>30000)delete PUB.rooms[k]}
function pubAsk(msg,cb){if(MOCK||!window.Peer){cb&&cb(null);return}if(PUB.reg){if(msg.t==='list'){pubPrune();cb&&cb(Object.values(PUB.rooms))}else if(msg.t==='ann')PUB.rooms[msg.room.code]=Object.assign({},msg.room,{ts:Date.now()});else if(msg.t==='unann')delete PUB.rooms[msg.code];return}
  try{const p=new Peer({debug:0});let done=false;const fin=v=>{if(done)return;done=true;cb&&cb(v);setTimeout(()=>{try{p.destroy()}catch(e){}},500)};
    p.on('open',()=>{const c=p.connect(LOBBY_ID,{serialization:'json',reliable:true});c.on('open',()=>{c.send(msg);if(msg.t!=='list')fin(true)});c.on('data',d=>{if(d&&d.t==='rooms')fin(d.list)});c.on('error',()=>fin(null))});
    p.on('error',e=>{if(e.type==='peer-unavailable'){fin(null);pubBecomeRegistry()}else fin(null)});setTimeout(()=>fin(null),6000)}catch(e){cb&&cb(null)}}
function pubList(cb){pubAsk({t:'list'},list=>{if(list===null&&!PUB.reg){pubBecomeRegistry();setTimeout(()=>cb(PUB.reg?Object.values(PUB.rooms):[]),1500)}else cb(list||[])})}
function pubAnnounce(){if(!NET.isHost||NET.status!=='hosting'||!PF.settings.pub)return;const s=PF.settings;pubAsk({t:'ann',room:{code:NET.code,host:PF.nick||'房主',mode:s.mode,map:s.map,n:Object.keys(NET.members).length,playing:!!M.running}})}
setInterval(()=>{if(NET.isHost&&NET.status==='hosting')pubAnnounce()},12000);
