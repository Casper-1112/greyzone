'use strict';
/* ================= multiplayer (WebRTC via PeerJS, or BroadcastChannel for local testing) ================= */
let netPuppets={};
const NET={tp:null,myId:null,code:null,isHost:false,members:{},sendT:0,snapT:0,hostId:null,status:'idle',hits:[]};
const PREFIX='greyzone2-';
function netAvailable(){const h=location.hostname;if(/claude\.ai$|claudeusercontent|anthropic/.test(h))return{ok:false,why:'Claude 作品頁不支援點對點連線。請使用 GitHub Pages 版本開房。'};
  if(!window.RTCPeerConnection&&!location.search.includes('mocknet'))return{ok:false,why:'這個瀏覽器不支援 WebRTC 連線。'};
  if(!window.Peer&&!location.search.includes('mocknet'))return{ok:false,why:'連線元件載入失敗，請檢查網路後重新整理。'};return{ok:true}}
// --- transports ---
function makePeerTransport(){const t={conns:{},on:{}};
  t.host=(code)=>{t.peer=new Peer(PREFIX+code,{debug:0});wire(true)};
  function addConn(c){c.on('open',()=>{t.conns[c.peer]=c;t.on.conn&&t.on.conn(c.peer)});c.on('data',d=>t.on.data&&t.on.data(c.peer,d));c.on('close',()=>{delete t.conns[c.peer];t.on.close&&t.on.close(c.peer)});c.on('error',()=>{})}
  function wire(isHost){t.peer.on('open',id=>{t.on.open&&t.on.open(id)});t.peer.on('connection',c=>addConn(c));t.peer.on('error',e=>t.on.error&&t.on.error(e.type||String(e)));t.peer.on('disconnected',()=>{try{t.peer.reconnect()}catch(e){}})}
  t.join=(code)=>{t.peer=new Peer({debug:0});wire(false);t.peer.on('open',()=>{const c=t.peer.connect(PREFIX+code,{serialization:'json',reliable:false});addConn(c);setTimeout(()=>{if(!Object.keys(t.conns).length)t.on.error&&t.on.error('peer-unavailable')},9000)})};
  t.send=(id,m)=>{const c=t.conns[id];if(c&&c.open)try{c.send(m)}catch(e){}};
  t.bcast=m=>{for(const id in t.conns)t.send(id,m)};
  t.close=()=>{try{t.peer&&t.peer.destroy()}catch(e){}t.conns={}};
  return t}
function makeBCTransport(){const t={conns:{},on:{}};const me='p'+Math.random().toString(36).slice(2,8);let bc=null,room=null,isHost=false;
  const post=(to,m)=>bc.postMessage({room,from:me,to,m});
  t.host=(code)=>{room=code;isHost=true;bc=new BroadcastChannel('gzmock');bc.onmessage=ev=>{const d=ev.data;if(d.room!==room||d.to!==me&&d.to!=='*')return;if(d.m&&d.m.__hello){t.conns[d.from]=1;post(d.from,{__ack:1});t.on.conn&&t.on.conn(d.from);return}if(d.m&&d.m.__bye){delete t.conns[d.from];t.on.close&&t.on.close(d.from);return}t.on.data&&t.on.data(d.from,d.m)};setTimeout(()=>t.on.open&&t.on.open(me),50)};
  t.join=(code)=>{room=code;bc=new BroadcastChannel('gzmock');bc.onmessage=ev=>{const d=ev.data;if(d.room!==room||d.to!==me)return;if(d.m&&d.m.__ack){t.conns[d.from]=1;t.hostId=d.from;t.on.conn&&t.on.conn(d.from);return}if(d.m&&d.m.__bye){delete t.conns[d.from];t.on.close&&t.on.close(d.from);return}t.on.data&&t.on.data(d.from,d.m)};
    setTimeout(()=>{t.on.open&&t.on.open(me);post('*',{__hello:1})},50)};
  t.send=(id,m)=>post(id,m);t.bcast=m=>{for(const id in t.conns)post(id,m)};t.close=()=>{if(bc){for(const id in t.conns)post(id,{__bye:1});bc.close()}};
  addEventListener('beforeunload',()=>t.close());return t}
function netCreate(asHost,code){netLeave();const av=netAvailable();if(!av.ok){UI.netStatus(av.why,true);return}
  NET.tp=location.search.includes('mocknet')?makeBCTransport():makePeerTransport();NET.isHost=asHost;NET.code=code;NET.members={};NET.status='connecting';
  const t=NET.tp;
  t.on.open=id=>{NET.myId=id;if(asHost){NET.hostId=id;NET.members[id]={nick:PF.nick||'房主',op:PF.operator,host:true};NET.status='hosting';UI.netStatus(`房間已建立：${code}`);UI.netLobby()}else UI.netStatus('正在連線到房間…')};
  t.on.conn=id=>{if(asHost){UI.netStatus(`房間 ${code}：有人加入`)}else{NET.hostId=id;NET.status='joined';t.send(id,{t:'hello',nick:PF.nick||'玩家',op:PF.operator});UI.netStatus(`已加入房間 ${code}`)}};
  t.on.data=(id,m)=>netOnData(id,m);
  t.on.close=id=>{if(asHost){delete NET.members[id];removePuppet(id);netBroadcastLobby();UI.netLobby()}else{UI.netStatus('與房主的連線中斷',true);NET.status='idle';if(M.running&&M.net){stopMatch();UI.toHub();banner('房主已離開','',2)}}};
  t.on.error=e=>{UI.netStatus(e==='unavailable-id'?'房號已被使用，換一個試試':e==='peer-unavailable'?'找不到這個房間，確認房號是否正確':'連線錯誤：'+e,true)};
  asHost?t.host(code):t.join(code)}
function netLeave(){if(NET.tp){NET.tp.close();NET.tp=null}NET.status='idle';NET.members={};for(const k in netPuppets)removePuppet(k)}
function netSend(m){if(!NET.tp||!M.net)return;if(NET.isHost){m.from=NET.myId;NET.tp.bcast(m);}else NET.tp.send(NET.hostId,m)}
function netBroadcastLobby(){if(!NET.isHost||!NET.tp)return;NET.tp.bcast({t:'lobby',members:NET.members,host:NET.myId})}
function netStartGame(cfg){if(!NET.isHost)return;NET.tp.bcast({t:'start',cfg});startMatch(Object.assign({},cfg,{net:true,isHost:true}));for(const id in NET.members)if(id!==NET.myId)ensurePuppet(id)}
// --- puppets for remote players ---
const nameTag=(txt)=>{const c=document.createElement('canvas');c.width=256;c.height=48;const g=c.getContext('2d');g.font='700 26px "Noto Sans TC",sans-serif';g.textAlign='center';g.fillStyle='rgba(10,12,9,.6)';g.fillRect(28,6,200,36);g.fillStyle='#72c8f5';g.fillText(txt.slice(0,10),128,33);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(1.6,.3,1);s.position.y=2.25;s.renderOrder=11;return s};
function ensurePuppet(id){if(netPuppets[id])return netPuppets[id];if(!_legGeo)_legGeo=new T.BoxGeometry(.2,.9,.22).translate(0,-.45,0);
  const g=new T.Group();const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.85});const up=new T.Mesh(botGeo('soldier',1),mat);up.castShadow=true;g.add(up);
  const lm=new T.MeshStandardMaterial({color:0x34404a});const legL=new T.Mesh(_legGeo,lm);legL.position.set(-.13,.9,0);g.add(legL);const legR=new T.Mesh(_legGeo,lm);legR.position.set(.13,.9,0);g.add(legR);
  const nm=(NET.members[id]&&NET.members[id].nick)||'隊友';g.add(nameTag(nm));scene.add(g);
  return netPuppets[id]={id,g,mat,legL,legR,pos:g.position,yaw:0,pitch:0,team:1,alive:true,downed:false,crouch:false,speed:0,torch:false,nick:nm,net:{x:0,y:0,z:0,yaw:0},fs:0,anim:0,hp:100}}
function removePuppet(id){const p=netPuppets[id];if(!p)return;scene.remove(p.g);delete netPuppets[id]}
function updatePuppets(dt){for(const k in netPuppets){const p=netPuppets[k],n=p.net,a=Math.min(1,dt*12);p.pos.x=lerp(p.pos.x,n.x,a);p.pos.y=lerp(p.pos.y,n.y,a);p.pos.z=lerp(p.pos.z,n.z,a);p.yaw+=angDiff(n.yaw,p.yaw)*a;
  p.g.rotation.y=p.yaw+Math.PI;p.g.visible=p.alive;p.g.rotation.z=p.downed?1.3:0;p.g.scale.y=p.crouch?.7:1;p.anim+=dt*(p.speed||0)*3.3;const sw=p.speed>.4?Math.sin(p.anim)*.6:0;p.legL.rotation.x=sw;p.legR.rotation.x=-sw}}
function myState(){return{x:+P.pos.x.toFixed(2),y:+P.pos.y.toFixed(2),z:+P.pos.z.toFixed(2),yw:+P.yaw.toFixed(3),pt:+P.pitch.toFixed(3),cr:P.crouch>.5?1:0,al:P.alive&&!P.spectate?1:0,dn:P.downed?1:0,fs:P.fireSeq||0,sp:+P.speed.toFixed(1),tc:P.torchOn?1:0,hp:Math.round(P.hp),nick:PF.nick||'玩家'}}
function applyPlayerState(id,s){const p=ensurePuppet(id);p.net.x=s.x;p.net.y=s.y;p.net.z=s.z;p.net.yaw=s.yw;p.pitch=s.pt;p.crouch=!!s.cr;p.alive=!!s.al;p.downed=!!s.dn;p.speed=s.sp;p.torch=!!s.tc;p.hp=s.hp;
  if(s.fs>p.fs&&p.alive){const n=Math.min(3,s.fs-p.fs);for(let i=0;i<n;i++){const dir=new T.Vector3(-Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch));const muz=new T.Vector3(p.pos.x,p.pos.y+1.4,p.pos.z).addScaledVector(dir,.8);
    const end=rayWorld(muz,dir,120)?muz.clone().addScaledVector(dir,RH.t):muz.clone().addScaledVector(dir,120);tracer(muz,end,0x9ad0ff,.025);worldFlash(muz);const dc=camera.position.distanceTo(p.pos);gunSnd(clamp(1-dc/140,.04,1)*.4,900,.2,dc<30?100:0,panTo(p.pos.x,p.pos.z))}}
  p.fs=s.fs}
// --- messages ---
function netOnData(from,m){if(!m||!m.t)return;
  if(NET.isHost){
    switch(m.t){
    case 'hello':NET.members[from]={nick:String(m.nick||'玩家').slice(0,12),op:m.op};netBroadcastLobby();UI.netLobby();if(M.running&&M.net)NET.tp.send(from,{t:'busy'});return;
    case 's':if(M.running)applyPlayerState(from,m.s);return;
    case 'hit':{const b=bots.find(x=>x.id===m.id);const pp=netPuppets[from];if(b&&!b.dead)damageBot(b,+m.dmg||0,m.part,{remote:from,pos:pp?pp.pos:null},null);return}
    case 'alarm':M.alarmT=30;alertNoise(new T.Vector3(m.x,0,m.z),90,new T.Vector3(m.x,0,m.z));spawnSquad(3,{x:m.x,z:m.z},40,60);return;
    case 'exTrig':spawnSquad(3,{x:m.x,z:m.z},30,48);return;
    case 'stun':{const b=bots.find(x=>x.id===m.id);if(b)b.stunT=3.5;return}
    case 'revive':if(m.to===NET.myId)revivePlayer();else NET.tp.send(m.to,{t:'revive'});return;
    }
    // relay visual/world events to others
    m.from=from;for(const id in NET.tp.conns)if(id!==from)NET.tp.send(id,m);netApplyShared(m);return}
  // client side
  switch(m.t){
  case 'lobby':NET.members=m.members;NET.hostId=m.host;UI.netLobby();return;
  case 'start':startMatch(Object.assign({},m.cfg,{net:true,isHost:false}));for(const id in NET.members)if(id!==NET.myId)ensurePuppet(id);return;
  case 'busy':UI.netStatus('房間正在遊戲中，請等這局結束',true);return;
  case 'w':if(M.running)applySnapshot(m);return;
  case 'dmg':if(M.running)damagePlayer(m.amt,new T.Vector3(m.x,0,m.z),{head:m.head});return;
  case 'kill':if(M.running){M.stats.kills++;if(m.head)M.stats.heads++;M.stats.score+=m.head?150:100;P.ult=Math.min(100,P.ult+12);hitmark('kill');PF.stats.kills++}return;
  case 'revive':revivePlayer();return;
  case 'banner':banner(m.a,m.b||'',2.2);return;
  case 'cqEnd':if(M.running&&!M.ending)endConquest(!!m.win);return;
  case 'end':if(M.running){stopMatch();UI.toHub();banner('房主結束了這局','',2)}return;
  }
  netApplyShared(m)}
function netApplyShared(m){if(!M.running)return;switch(m.t){
  case 'proj':spawnRemoteProj(m);break;
  case 'skill':doSkill(m.id,false,m);break;
  case 'rockets':doSkill('bulwark.s3',false,{tx:m.x,tz:m.z,x:m.x,y:0,z:m.z});break;
  case 'door':{const d=W.doors[m.i];if(d&&d.open!==m.o){d.open=m.o;d.target=m.o?1:0;d.box.off=m.o}break}
  case 'unlock':{const d=W.doors[m.i];if(d){d.locked=null}break}
  case 'power':activatePower();break;
  case 'heli':if(!M.heli)callHeli(30);break;}}
// --- host snapshot ---
function makeSnapshot(){const b=[];for(const x of bots){if(x.puppet)continue;b.push([x.id,KIND_IDX.indexOf(x.kind),x.team,+x.pos.x.toFixed(2),+x.pos.y.toFixed(2),+x.pos.z.toFixed(2),+x.yaw.toFixed(2),Math.round(x.hp/x.maxHp*100),(x.dead?1:0)|(x.stunT>0?2:0),x.fireSeq,x.tgt?(x.tgt.local?NET.myId:x.tgt.remote!==undefined?x.tgt.remote:x.tgt.bot?x.tgt.bot.id:0):0,+(x.speedNow||0).toFixed(1)])}
  const p={};p[NET.myId]=myState();for(const k in netPuppets){const q=netPuppets[k];p[k]={x:q.net.x,y:q.net.y,z:q.net.z,yw:q.net.yaw,pt:q.pitch,cr:q.crouch?1:0,al:q.alive?1:0,dn:q.downed?1:0,fs:q.fs,sp:q.speed,tc:q.torch?1:0,hp:q.hp}}
  return{t:'w',b,p,fl:W.flags.map(f=>[+f.v.toFixed(3),f.owner]),tk:[M.tickets[1],M.tickets[2]],L:M.left,cq:M.cqLeft}}
function applySnapshot(s){const seen=new Set();
  for(const a of s.b){const [id,ki,team,x,y,z,yaw,hp,fl,fs,tgt]=a;seen.add(id);let b=bots.find(q=>q.id===id);
    if(!b){b=makeBot(KIND_IDX[ki]||'grunt',team,x,y,z,{id,puppet:true});b.fireSeq=fs;b.hpPct=hp}
    const sp=Math.hypot(x-b.net.x,z-b.net.z)/.066;b.net.x=x;b.net.y=y;b.net.z=z;b.net.yaw=yaw;b.net.spd=Math.min(6,sp);b.hp=hp/100*b.maxHp;b.stunT=fl&2?1:0;
    if((fl&1)&&!b.dead){b.dead=true;b.deathT=0;if(M.mode==='extract')b.onDeadDone=bb=>addBody(bb)}
    if(fs>b.fireSeq&&!b.dead){b.fireSeq=fs;let aim=null;if(tgt===NET.myId)aim=new T.Vector3(P.pos.x+rnd(-.8,.8),P.pos.y+P.eyeH()-.3+rnd(-.4,.4),P.pos.z+rnd(-.8,.8));else if(netPuppets[tgt])aim=netPuppets[tgt].pos.clone().setY(netPuppets[tgt].pos.y+1.3);else{const tb=bots.find(q=>q.id===tgt);if(tb)aim=tb.pos.clone().setY(tb.pos.y+1.3)}
      if(aim){const muz=botMuzzle(b,new T.Vector3()).clone();shotFX(b,muz,aim,0)}}}
  for(const b of bots.slice())if(b.puppet&&!seen.has(b.id))removeBot(b);
  for(const id in s.p){if(id===NET.myId)continue;applyPlayerState(id,s.p[id])}
  for(const k in netPuppets)if(!s.p[k])removePuppet(k);
  s.fl.forEach((f,i)=>{const F=W.flags[i];if(F){F.v=f[0];F.owner=f[1]}});M.tickets[1]=s.tk[0];M.tickets[2]=s.tk[1];if(M.mode==='extract'){/* keep own clock */}else M.cqLeft=s.cq}
function netTick(dt){if(!M.net||!NET.tp)return;updatePuppets(dt);
  if(NET.isHost){NET.snapT-=dt;if(NET.snapT<=0){NET.snapT=.066;NET.tp.bcast(makeSnapshot())}}
  else{NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=.05;NET.tp.send(NET.hostId,{t:'s',s:myState()})}}}
// hooks used by gameplay
function netReportHit(id,dmg,part){if(!NET.isHost)NET.tp&&NET.tp.send(NET.hostId,{t:'hit',id,dmg:Math.round(dmg),part})}
function netDamageRemote(peer,dmg,srcPos,head){if(NET.isHost&&NET.tp)NET.tp.send(peer,{t:'dmg',amt:+dmg.toFixed(1),x:srcPos.x,z:srcPos.z,head})}
function netHitPlayer(){/* friendly fire off */}
function netEndForAll(){if(NET.isHost&&NET.tp)NET.tp.bcast({t:'end'})}
