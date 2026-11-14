'use strict';
/* ================= 戰鬥機（全面戰場） =================
   - 雙方機場在核心區東西兩側外圍（10 km 大世界），各有 2 架戰鬥機，走過去按 F 上機。
   - 操作：W 加油門、S 減油門／煞車；滑鼠左右控制機頭方向；空白鍵拉高、C 鍵壓低；A / D 側滾；左鍵機砲；
     右鍵發射導引飛彈：飛彈會飛向畫面準心指的位置，用滑鼠引導，再按一次右鍵提早引爆。導引期間戰鬥機自動減速、保持高度緩慢前進（不會失速）；
     F 彈射跳傘。
   - 不按油門時戰鬥機會自己緩慢前進（地面滑行 10 m/s、空中巡航 55 m/s），按住 S 煞停。
   - 起飛要助跑：在地面上先按 W 加速到 45 m/s 以上才能按空白鍵拉起；速度低於 40 m/s 會失速下墜；撞到地面會墜毀。
   - 沒有玩家駕駛時，房主端會派 AI 戰鬥機在戰場上空巡航，定時對敵方據點掃射，可以被打下來（約 60 秒後重新起飛）。 */
const JET_MAX=130,JET_STALL=40;
function jetMesh(col){const g=new T.Group();const m=new T.MeshStandardMaterial({color:col,roughness:.45,metalness:.55}),dk=new T.MeshStandardMaterial({color:0x22262a,roughness:.5,metalness:.5}),gl=new T.MeshStandardMaterial({color:0x6a8aa0,roughness:.1,metalness:.8,emissive:0x0a1a2a});
  const B=(w,h,d,mt,x,y,z,rx=0,ry=0,rz=0)=>{const q=new T.Mesh(new T.BoxGeometry(w,h,d),mt);q.position.set(x,y,z);q.rotation.set(rx,ry,rz);q.castShadow=true;g.add(q);return q};
  const body=new T.Mesh(new T.CylinderGeometry(.75,.9,11,10).rotateX(Math.PI/2),m);body.castShadow=true;g.add(body);
  const nose=new T.Mesh(new T.ConeGeometry(.75,3,10).rotateX(Math.PI/2),m);nose.position.z=7;g.add(nose);
  const can=new T.Mesh(new T.SphereGeometry(.65,12,8,0,TAU,0,Math.PI/2),gl);can.scale.set(1,.8,2.2);can.position.set(0,.55,3.4);g.add(can);
  B(10.5,.16,3.2,m,0,-.1,-.6,0,0,0);B(3.2,.14,1.4,m,0,0,-5,0,0,0);B(.14,2.4,1.8,m,0,1.2,-4.8,0,0,0);
  for(const s of [-1,1]){B(.5,.5,2.6,dk,s*.9,-.35,2.4);B(.25,.25,2.2,dk,s*3.6,-.3,0)}
  const ex=new T.Mesh(new T.CylinderGeometry(.55,.62,.6,12).rotateX(Math.PI/2),new T.MeshBasicMaterial({color:0xff8a3a}));ex.position.z=-5.8;g.add(ex);g.userData.flame=ex;
  for(const s of [-1,1]){const w=new T.Mesh(new T.CylinderGeometry(.2,.2,.18,10).rotateZ(Math.PI/2),dk);w.position.set(s*1.2,-1.1,-.5);g.add(w)}{const w=new T.Mesh(new T.CylinderGeometry(.16,.16,.15,10).rotateZ(Math.PI/2),dk);w.position.set(0,-1.1,4.5);g.add(w)}
  g.userData.wheels=[];return g}
function spawnJet(x,z,yaw,team,ai){const id=(W.cars||(W.cars=[])).length;const g=jetMesh(team===1?0x5a6a78:0x786a5a);const y=terrH(x,z)+1.3;g.position.set(x,y,z);g.rotation.order='YXZ';g.rotation.y=yaw;addObj(g);
  g.traverse(o=>{if(o.material&&o.material.color)o._c0=o.material.color.clone()});const c={id,g,pos:g.position,yaw,pitch:0,roll:0,spd:0,hp:650,maxHp:650,name:'戰鬥機',driver:null,net:null,dead:false,kind:'jet',team,cd:0,mcd:0,vy:0,home:{x,z,yaw},ai:!!ai,air:false};W.cars.push(c);if(!ai)landmark('戰鬥機',x,z,4);return c}
function setupJets(){if(M.mode!=='conquest'||!(W.world>W.half))return;W.aiJets=[];
  for(const t of [1,2]){const sx=t===1?-1:1,ax=sx*(W.half+260);const yaw=sx<0?0:Math.PI;// 跑道沿 z 軸
    spawnJet(ax-8,-60,yaw,t);spawnJet(ax+8,-60,yaw,t);if(!M.net||M.isHost)W.aiJets.push(spawnJet(ax,60,yaw,t,true))}}

// 玩家駕駛
function updateJet(c,dt){let th=(keys.KeyW?1:0)-(keys.KeyS?1:0);if(touchS.stickId!==null)th=-touchS.jy;const rl=(keys.KeyA?1:0)-(keys.KeyD?1:0);
  const gy=terrH(c.pos.x,c.pos.z);const onG=c.pos.y<=gy+1.4;if(c.guide&&c.guide.done){c.guide=null;c.recoverT=5}if(c.recoverT>0){c.recoverT-=dt;if(c.spd<JET_STALL+15)c.spd=Math.min(JET_MAX,c.spd+32*dt);else c.recoverT=0}
  // 放開油門時不會停下：地面上以 10 m/s 緩慢滑行，空中維持 55 m/s 巡航（高於失速速度）；按住 S 才會煞停
  c.spd=clamp(c.spd+th*(th>0?22:30)*dt,0,JET_MAX);if(th===0&&!c.guide){const idle=onG?10:55;c.spd+=(idle-c.spd)*Math.min(1,dt*(c.spd>idle?.25:.6))}
  // 機頭左右跟著滑鼠；高低用空白鍵（拉高）與 C（壓低），放開會慢慢回到水平
  const g=c.guide&&!c.guide.done;if(g){c.spd+=(24-c.spd)*Math.min(1,dt*1.5);th=0}
  const vert=g?0:(keys.Space?1:0)-(keys.KeyC?1:0);const wantYaw=g?c.yaw:P.yaw+Math.PI;const tr=(onG?.8:1.15)*Math.min(1,.35+c.spd/90);
  let wantP=vert*.55;if(onG){if(vert>0&&c.spd<45){wantP=0;if(M.frame%50===0)note('速度不足，先按 W 助跑到 45 m/s 再拉起')}if(vert<0)wantP=0}
  c.yaw+=clamp(angDiff(wantYaw,c.yaw),-tr*dt,tr*dt);c.pitch+=clamp(wantP-c.pitch,-.8*dt,.8*dt);if(onG&&c.pitch<0)c.pitch=0;
  c.roll+=((rl*.9+clamp(angDiff(wantYaw,c.yaw),-.8,.8)*-.9)-c.roll)*Math.min(1,dt*3);
  const cp=Math.cos(c.pitch),f=new T.Vector3(Math.sin(c.yaw)*cp,Math.sin(c.pitch),Math.cos(c.yaw)*cp);
  let vy=f.y*c.spd;if(!onG&&c.spd<JET_STALL&&!g&&!(c.recoverT>0)){vy-=(JET_STALL-c.spd)*.6;c.pitch=Math.max(-.6,c.pitch-dt*.25);if(M.frame%40===0)note('失速！加油門（W）')}
  c.pos.x+=f.x*c.spd*dt;c.pos.z+=f.z*c.spd*dt;c.pos.y+=vy*dt;const WH=(W.world||W.half)-30;if(Math.abs(c.pos.x)>WH||Math.abs(c.pos.z)>WH){c.yaw+=Math.PI*dt;note('到達邊界，自動轉向')}c.pos.x=clamp(c.pos.x,-WH,WH);c.pos.z=clamp(c.pos.z,-WH,WH);
  const g2=terrH(c.pos.x,c.pos.z);if(c.pos.y<g2+1.3){if(!onG&&(vy<-9||c.spd>70&&c.pitch<-.15)){jetCrash(c);return}c.pos.y=g2+1.3;c.spd*=1-dt*(th<0?1.2:.05)}c.pos.y=Math.min(c.pos.y,900);
  // 撞建築
  if(c.spd>20){const q=gridQuery(c.pos.x-3,c.pos.z-3,c.pos.x+3,c.pos.z+3);for(const b of q)if(!b.off&&b.solid&&!b.tree&&b.maxY>c.pos.y-.5&&b.minY<c.pos.y+.5&&c.pos.x>b.minX-2&&c.pos.x<b.maxX+2&&c.pos.z>b.minZ-2&&c.pos.z<b.maxZ+2){jetCrash(c);return}}
  jetPose(c);c.g.userData.flame.scale.set(1,1,.5+c.spd/JET_MAX*2.5);
  c.cd-=dt;c.mcd-=dt;if(mouse.l&&c.cd<=0){c.cd=.06;jetGun(c,f,P.team,true)}
  P.pos.set(c.pos.x,c.pos.y+.4,c.pos.z);P.vel.set(0,0,0);P.speed=c.spd;
  if(!c._snd||M.t-c._snd>.2){c._snd=M.t;gunSnd(.05+c.spd/JET_MAX*.08,90+c.spd*2.5,.22,0)}
  jetHudShow(c,gy)}
function jetCrash(c){const p=c.pos.clone();carDamage(c,9999);if(P.alive){P.buff.godT=0;damagePlayer(400,p,{explosion:true,how:'戰鬥機墜毀'})}}
function jetPose(c){c.g.rotation.order='YXZ';c.g.rotation.set(-c.pitch,c.yaw,c.roll)}
function jetGun(c,f,team,isPlayer){const muz=c.pos.clone().addScaledVector(f,7.5);const d=f.clone().add(new T.Vector3(rnd(-.012,.012),rnd(-.012,.012),rnd(-.012,.012))).normalize();
  const h=rayActors(muz,d,450,team);const wall=rayWorld(muz,d,450)?RH.t:450;const vh=vehRay(muz,d,Math.min(wall,h?h.t:450),team,c);const t=Math.min(wall,h?h.t:450,vh?vh.t:1e9);const end=muz.clone().addScaledVector(d,t);
  tracer(muz,end,0xffd27a,.05);gunSnd(.12,600,.05,0);
  if(!isPlayer&&P&&P.alive&&!P.car&&hostile(c.team,P.team)){const oc=P.pos.clone().add(new T.Vector3(0,1,0)).sub(muz);const tp=oc.dot(d);if(tp>0&&tp<t&&oc.lengthSq()-tp*tp<1.4){damagePlayer(26,c.pos,{how:'戰鬥機掃射'});return}}
  if(vh&&vh.t<=t+.01){carDamage(vh.c,14);if(isPlayer)hitmark('body')}
  else if(h&&h.t<wall){if(isPlayer)skHit(h.isBot?{b:h.ent,pos:h.ent.pos}:{p:h.ent,pos:h.ent.pos},{dmg:26,how:'戰鬥機機砲'},c.pos);else jetHitActor(h,26,c.pos)}
  else{emit(end,4,'dust',3,.4,.06);if(Math.random()<.15)emit(end,3,'spark',4,.2,.03)}}
function jetHitActor(h,dmg,src){if(h.isBot)damageBot(h.ent,dmg,'body',{env:true,how:'戰鬥機機砲'},null);else if(h.ent===P)damagePlayer(dmg,src,{how:'戰鬥機掃射'});else if(h.ent.id&&typeof netDamageRemote==='function')netDamageRemote(h.ent.id,dmg,src,false,'jet')}
// 導引飛彈：右鍵發射，飛向準心指的位置；再按右鍵提早引爆
function jetMissile(){const c=P.car;if(!c||c.kind!=='jet')return;if(c.guide&&!c.guide.done){c.guide.det=true;return}if(c.mcd>0){note(`飛彈冷卻中 ${Math.ceil(c.mcd)} 秒`);return}c.mcd=8;
  const cp=Math.cos(c.pitch),f=new T.Vector3(Math.sin(c.yaw)*cp,Math.sin(c.pitch),Math.cos(c.yaw)*cp);
  const p=c.pos.clone().addScaledVector(f,8).add(new T.Vector3(0,-1.2,0));const mv={p,v:f.clone().multiplyScalar(Math.max(60,c.spd*.6)),t:0,guided:true,team:P.team,owner:c};(W.jetMsl||(W.jetMsl=[])).push(mv);c.guide=mv;
  const m=new T.Mesh(new T.CylinderGeometry(.14,.14,1.8,6).rotateX(Math.PI/2),new T.MeshStandardMaterial({color:0xdddddd,emissive:0x663300}));m.position.copy(p);scene.add(m);mv.m=m;
  note('導引飛彈發射：用準心引導，右鍵提早引爆');blip(900,.15,'sawtooth',.05);blip(1400,.2,'sawtooth',.04,0,.1)}
function msAimPoint(){const d=new T.Vector3();camera.getWorldDirection(d);const o=camera.position.clone().addScaledVector(d,12);return rayWorld(o,d,2500)?o.addScaledVector(d,RH.t):o.addScaledVector(d,2500)}
function updateJetMissiles(dt){const L=W.jetMsl;if(!L)return;for(let i=L.length-1;i>=0;i--){const mv=L[i];mv.t+=dt;
    if(mv.guided&&P.car===mv.owner){const want=msAimPoint().sub(mv.p).normalize().multiplyScalar(mv.v.length());mv.v.lerp(want,Math.min(1,dt*4))}
    mv.v.setLength(Math.min(150,mv.v.length()+dt*60));mv.p.addScaledVector(mv.v,dt);mv.m.position.copy(mv.p);mv.m.lookAt(mv.p.clone().add(mv.v));if(M.frame%2===0)puff(mv.p,1,1.2,1.4,0xcfcfcf,.4,.1,.2);
    let hitCar=null;for(const o of W.cars||[])if(!o.dead&&o!==mv.owner&&o.pos.distanceTo(mv.p)<4.5){hitCar=o;break}
    let hitBot=false;for(const b of bots)if(!b.dead&&hostile(mv.team,b.team)&&Math.hypot(b.pos.x-mv.p.x,b.pos.z-mv.p.z)<1.6&&mv.p.y>b.pos.y-.5&&mv.p.y<b.pos.y+2.4){hitBot=true;break}
    const hitG=mv.p.y<terrH(mv.p.x,mv.p.z)+.3||(rayWorld(mv.p,mv.v.clone().normalize(),mv.v.length()*dt+.5)&&RH.t<mv.v.length()*dt+.5);
    if(hitCar||hitBot||hitG||mv.det||mv.t>12){boomAt(mv.p.clone(),7,320,'導引飛彈');if(hitCar)carDamage(hitCar,520);scene.remove(mv.m);mv.done=true;L.splice(i,1)}}}

// 子彈打載具（直升機、戰鬥機）
function vehRay(a,d,maxT,team,self){let best=null;for(const c of W.cars||[]){if(c.dead||c===self||(c.kind!=='jet'&&c.kind!=='heli'))continue;if(c.team&&team&&c.team===team&&!(c.ai&&false))continue;if(P.car===c&&team===P.team)continue;
    const R=c.kind==='jet'?4.5:3.2;const oc=c.pos.clone().sub(a);const t=oc.dot(d);if(t<0||t>maxT)continue;const d2=oc.lengthSq()-t*t;if(d2<R*R&&(!best||t<best.t))best={c,t}}return best}

// AI 戰鬥機（房主端）
function updateAiJets(dt){if(!W.aiJets||(M.net&&!M.isHost))return;for(const c of W.aiJets){
    if(c.dead){c.respT=(c.respT||60)-dt;if(c.respT<=0){c.respT=0;c.dead=false;c.hp=c.maxHp;c.g.traverse(o=>{if(o.material&&o.material.color&&o._c0)o.material.color.copy(o._c0)});c.pos.set(c.home.x,terrH(c.home.x,c.home.z)+1.3,c.home.z);c.spd=0;c.air=false;c.pitch=0;c.yaw=c.home.yaw;c.g.visible=true}continue}
    if(c.driver)continue;// 被玩家開走了
    const sx=c.team===1?-1:1;c.aiT=(c.aiT||0)-dt;
    if(!c.air){c.spd=Math.min(95,c.spd+dt*20);c.pos.x+=Math.sin(c.yaw)*c.spd*dt;c.pos.z+=Math.cos(c.yaw)*c.spd*dt;c.pos.y=terrH(c.pos.x,c.pos.z)+1.3;c.pitch=0;if(c.spd>60){c.air=true;c.mode='climb';c.tgt=null;c.aiT=0}jetPose(c);continue}
    // 選目標：敵方據點附近的敵人
    if(!c.tgt||c.aiT<=0){c.aiT=rnd(18,30);const flags=W.flags.filter(f=>f.owner&&f.owner!==c.team);const f=flags.length?pick(flags):pick(W.flags);c.tgt={x:f.x,z:f.z};c.mode='cruise'}
    const alt=terrH(c.pos.x,c.pos.z);let ty,tx=c.tgt.x,tz=c.tgt.z;const dxz=Math.hypot(tx-c.pos.x,tz-c.pos.z);
    if(c.mode==='cruise'){ty=alt+160;const a=M.t*.12+(c.team*Math.PI);if(dxz<500&&c.aiT<12)c.mode='dive';else{tx=c.tgt.x+Math.cos(a)*450;tz=c.tgt.z+Math.sin(a)*450}}
    else{ty=Math.max(alt+25,terrH(tx,tz)+18);if(dxz<60||c.pos.y<alt+22)c.mode='climb';
      if(dxz<420&&dxz>40){c.cd-=dt;if(c.cd<=0){c.cd=.09;const tgtA=nearestHostileTo(c,tx,tz);const aim=tgtA?tgtA.clone().add(new T.Vector3(0,1,0)):new T.Vector3(tx,terrH(tx,tz),tz);jetGun(c,aim.sub(c.pos).normalize(),c.team,false)}}}
    if(c.mode==='climb'){ty=alt+200;if(c.pos.y>alt+120){c.mode='cruise';c.aiT=rnd(14,22)}}
    const wantYaw=Math.atan2(tx-c.pos.x,tz-c.pos.z),wantP=clamp(Math.atan2(ty-c.pos.y,Math.max(60,dxz)),-.7,.6);
    c.yaw+=clamp(angDiff(wantYaw,c.yaw),-.55*dt,.55*dt);c.pitch+=clamp(wantP-c.pitch,-.5*dt,.5*dt);c.roll+=(clamp(angDiff(wantYaw,c.yaw),-.9,.9)*-1-c.roll)*Math.min(1,dt*2);c.spd=c.mode==='dive'?120:105;
    const cp=Math.cos(c.pitch);c.pos.x+=Math.sin(c.yaw)*cp*c.spd*dt;c.pos.z+=Math.cos(c.yaw)*cp*c.spd*dt;c.pos.y+=Math.sin(c.pitch)*c.spd*dt;const g=terrH(c.pos.x,c.pos.z);if(c.pos.y<g+12){c.pos.y=g+12;c.mode='climb'}
    const WH=(W.world||W.half)-60;c.pos.x=clamp(c.pos.x,-WH,WH);c.pos.z=clamp(c.pos.z,-WH,WH);jetPose(c);c.g.userData.flame.scale.set(1,1,2.5);
    if(M.net&&M.frame%4===0)netSend({t:'car',id:c.id,x:+c.pos.x.toFixed(1),y:+c.pos.y.toFixed(1),z:+c.pos.z.toFixed(1),yw:+c.yaw.toFixed(2),pt:+c.pitch.toFixed(2),rl:+c.roll.toFixed(2),d:0})}}
function nearestHostileTo(c,x,z){let best=null,bd=60;const chk=(p,t)=>{if(!hostile(c.team,t))return;const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p}};for(const b of bots)if(!b.dead)chk(b.pos,b.team);if(P&&P.alive)chk(P.pos,P.team);for(const k in netPuppets){const q=netPuppets[k];if(q.alive)chk(q.pos,q.team)}return best?best.clone():null}
function jetCam(c){const cp=Math.cos(c.pitch);const f=new T.Vector3(Math.sin(c.yaw)*cp,Math.sin(c.pitch),Math.cos(c.yaw)*cp);const lookF=new T.Vector3(-Math.sin(P.yaw)*Math.cos(P.pitch),Math.sin(P.pitch),-Math.cos(P.yaw)*Math.cos(P.pitch));
  const want=c.pos.clone().addScaledVector(lookF,-16).add(new T.Vector3(0,4,0));camera.position.lerp(want,.35);camera.rotation.set(P.pitch,P.yaw,0);camera.updateMatrixWorld()}
// 彈射
function jetEject(c){P.pos.set(c.pos.x,c.pos.y+3,c.pos.z);c.driver=null;P.car=null;P.chute=c.pos.y-terrH(c.pos.x,c.pos.z)>8;if(P.chute)note('已彈射，降落傘展開中');}
function updateChute(dt){if(!P||!P.chute)return;if(P.onGround||P.pos.y<terrH(P.pos.x,P.pos.z)+.3){P.chute=false;return}P.vel.y=Math.max(P.vel.y,-5)}
// 機上 HUD
function jetHudShow(c,gy){if(M.frame%5)return;const el=$('jetHud');el.hidden=false;el.textContent=`戰鬥機 · 速度 ${Math.round(c.spd*3.6)} km/h · 高度 ${Math.round(c.pos.y-gy)} m · 機體 ${Math.max(0,Math.round(c.hp/c.maxHp*100))}% · 飛彈 ${c.guide&&!c.guide.done?'導引中（右鍵引爆）':c.mcd>0?Math.ceil(c.mcd)+' 秒':'就緒'}　W/S 油門 · 空白鍵拉高 · C 壓低 · 滑鼠轉向 · 左鍵機砲 · 右鍵導引飛彈 · F 彈射`};
