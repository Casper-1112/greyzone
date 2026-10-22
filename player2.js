'use strict';
/* ================= player update ================= */
function inLadder(){for(const l of W.ladders)if(P.pos.x>l.minX&&P.pos.x<l.maxX&&P.pos.z>l.minZ&&P.pos.z<l.maxZ&&P.pos.y<l.top)return l;return null}
function updatePlayer(dt){
  const fk=Math.max(.16,camera.fov/BASEFOV())*PF.settings.sens*(P.adsK>.5?PF.settings.adsSens:1);P.yaw-=lookDX*.0021*fk;P.pitch-=lookDY*.0021*fk;lookDX=lookDY=0;P.pitch=clamp(P.pitch,-1.5,1.5);
  // timers
  for(const k of ['s1','s2'])P.cd[k]=Math.max(0,P.cd[k]-dt);if(P.alive)P.ult=Math.min(100,P.ult+dt*(M.mode==='conquest'?1.4:.7));
  for(const k in P.buff)P.buff[k]=Math.max(0,P.buff[k]-dt);P.blindT=Math.max(0,(P.blindT||0)-dt);
  if(P.regenT>0){P.regenT-=dt;P.hp=Math.min(100,P.hp+P.regenAmt/3*dt)}
  if(P.buff.heartT>0||P.buff.scanT>0)for(const b of bots){if(b.dead||b.team===P.team)continue;if(P.buff.scanT>0||b.pos.distanceTo(P.pos)<35)b.markT=Math.max(b.markT,.25)}
  if(P.charging)P.charge=Math.min(1,P.charge+dt/.8);
  if(!P.alive)return;
  if(P.zip){updateZip(dt);return}
  if(P.vault){P.vault.t+=dt/P.vault.dur;const k=Math.min(1,P.vault.t);P.pos.lerpVectors(P.vault.a,P.vault.b,k);P.pos.y=lerp(P.vault.a.y,P.vault.b.y,Math.min(1,k*1.6));if(k>=1){P.vault=null;P.onGround=true;P.vy=0}return}
  if(M.countdown>0){P.vel.set(0,0,0);P.speed=0;return}
  if(P.downed){P.bleed-=dt;if(P.bleed<=0){playerDie({bleed:true});return}}
  const k=keys;
  let fi=(k.KeyW?1:0)-(k.KeyS?1:0),si=(k.KeyD?1:0)-(k.KeyA?1:0);const stickOn=touchS.stickId!==null;if(stickOn){fi=-touchS.jy;si=touchS.jx}
  const s=curW();
  if(P.slideT>0)P.crouch=Math.min(1,P.crouch+dt*12);else P.crouch+=((P.crouchOn||P.downed?1:0)-P.crouch)*Math.min(1,dt*12);
  P.sprint=((k.ShiftLeft||k.ShiftRight)&&fi>0||stickOn&&fi>.85)&&P.adsK<.3&&!mouse.l&&!P.crouchOn&&P.healT<=0&&P.repairT<=0&&!P.downed&&P.slideT<=0;
  let spd=P.sprint?6.7:P.crouch>.5?2.3:P.adsK>.5?2.7:4.3;if(s&&s.st)spd*=s.st.move;if(P.buff.speedT>0)spd*=1.35;if(P.healT>0||P.repairT>0)spd*=.55;if(P.downed)spd=.7;
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);let mx=-sy*fi+cy*si,mz=-cy*fi-sy*si;const l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l}
  const noInput=Math.abs(fi)<.05&&Math.abs(si)<.05;const acc=P.onGround?(noInput?20:13):(P.padT>0?0:2.5);if(P.padT>0)P.padT-=dt;
  if(P.slideT>0){P.slideT-=dt;const v=3+7*Math.max(0,P.slideT)/.8;P.vel.x=P.slideDir.x*v;P.vel.z=P.slideDir.z*v}
  else{P.vel.x+=(mx*spd-P.vel.x)*Math.min(1,dt*acc);P.vel.z+=(mz*spd-P.vel.z)*Math.min(1,dt*acc)}
  const feet=P.pos.y,head=feet+1.78-P.crouch*.6;
  const lad=inLadder();P.laddering=!!lad&&(fi>0||k.Space)&&!P.downed;
  if(P.laddering){P.vel.x*=.3;P.vel.z*=.3}
  moveCircle(P.pos,P.vel.x*dt,P.vel.z*dt,.38,feet,head);if(W.clampExtra)W.clampExtra(P.pos);
  if(P.laddering){P.vy=3.4;P.pos.y+=P.vy*dt;P.onGround=false;P.fallStart=P.pos.y}
  else if(lad&&!P.onGround){P.vy=0}
  else{
    if(k.Space&&P.onGround&&!P.downed){if(!tryVault()){P.vy=6.2*(GRAV<15?1.15:1);P.onGround=false;if(P.slideT>0)P.slideT=0}}
    P.vy-=GRAV*dt;P.pos.y+=P.vy*dt;
    if(P.vy>0&&ceilingHit(P.pos.x,P.pos.z,.3,P.pos.y,P.pos.y+1.8)){P.vy=0}}
  const g=groundAt(P.pos.x,P.pos.z,.3,feet);
  if(P.pos.y<=g){if(!P.onGround){const fallV=-P.vy;if(fallV>13&&!P.laddering&&P.padT<=0&&GRAV>15){damagePlayer((fallV-13)*9,null,{fall:true});noiseHit(.2,300,.3)}else if(fallV>6){P.shake=Math.max(P.shake,.3);blip(90,.08,'sine',.08)}}P.pos.y=g;P.vy=0;P.onGround=true}
  else if(P.pos.y>g+.06&&!P.laddering){if(P.onGround&&P.vy<=0)P.vy=0;P.onGround=false}
  P.speed=Math.hypot(P.vel.x,P.vel.z);
  if(P.onGround)for(const pd of W.pads){if(Math.hypot(P.pos.x-pd.x,P.pos.z-pd.z)<1.15&&Math.abs(P.pos.y-pd.y)<.6){P.vy=pd.vy;P.vel.x=pd.vx;P.vel.z=pd.vz;P.padT=1.6;P.onGround=false;P.pos.y+=.1;blip(300,.25,'sine',.08,600);emit(P.pos,12,'green',5,.5,.06,2);break}}
  if(P.onGround&&P.speed>.6&&P.slideT<=0){const pb=P.bob;P.bob+=dt*P.speed*1.85;if(Math.floor(pb/Math.PI)!==Math.floor(P.bob/Math.PI))noiseHit(.09,P.sprint?900:600,P.crouch>.5?.04:P.sprint?.14:.08)}
  if(P.sprint)alertNoise(P.pos,10,P.pos);
  if(P.healT>0){P.healT-=dt;if(P.healT<=0){P.hp=Math.min(100,P.hp+P.healAmt);blip(660,.1,'sine',.05);blip(990,.12,'sine',.05,0,.08);note('生命 +'+P.healAmt)}}
  if(P.repairT>0){P.repairT-=dt;if(P.repairT<=0){P.armor.dur=Math.min(P.armor.max,P.armor.dur+40);note('護甲耐久 +40')}}
}
function aimAssist(dt){if(!isTouch||!P.alive)return;const str=mouse.l?3.2:(P.adsK>.5?1.8:0);if(!str)return;let best=null,bs=.1;const cp=camera.position;
  for(const b of bots){if(b.dead||b.team===P.team)continue;const dx=b.pos.x-cp.x,dy=b.pos.y+1.3-cp.y,dz=b.pos.z-cp.z,h=Math.hypot(dx,dz);if(h>120)continue;
    const wy=Math.atan2(-dx,-dz),wp=Math.atan2(dy,h);const ay=angDiff(wy,P.yaw),ap=wp-P.pitch;const s=Math.hypot(ay,ap);if(s<bs&&los(cp,_e1.set(b.pos.x,b.pos.y+1.3,b.pos.z))){bs=s;best=[ay,ap]}}
  if(best){const k=Math.min(1,dt*str);P.yaw+=best[0]*k;P.pitch+=best[1]*k}}
function updateCamera(){
  camera.position.set(P.pos.x,P.pos.y+P.eyeH(),P.pos.z);
  const sk=P.shake*.06;camera.position.x+=rnd(-sk,sk);camera.position.y+=rnd(-sk,sk);
  const s=curW();const sw=s&&s.st&&s.st.scope&&P.adsK>.5?(1-P.crouch*.6):0;
  camera.rotation.set(P.pitch+P.kick+Math.sin(M.t*1.3)*.0022*sw,P.yaw+Math.sin(M.t*.9)*.0018*sw,!P.alive?.4:P.downed?.25:P.slideT>0?-.06:0);camera.updateMatrixWorld();
  torch.intensity=P.torchOn?(M.tod==='night'?2.8:M.tod==='dusk'?1.6:.5):0}
function updateWeapon(dt){
  const s=curW();P.fireT-=dt;P.nadeCd-=dt;P.meleeT-=dt;
  const busy=P.reloadT>0||P.switchT>0||P.sprint||P.healT>0||P.repairT>0||!P.alive||P.downed||(s&&s.knife)||P.meleeT>0;
  const adsWant=P.ads&&!busy;const st=s&&s.st;
  P.adsK+=((adsWant?1:0)-P.adsK)*Math.min(1,dt/(st?st.adsT:.2)*2.2);
  const zoom=st?st.zoom*(st.scope&&P.zoomStage===2?1.8:1):1;const fov=BASEFOV()/(1+(zoom-1)*P.adsK);if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}
  if(P.reloadT>0){P.reloadT-=dt;if(P.reloadT<=0){const c=s.def.ammo;const take=Math.min(s.st.mag-s.mag,P.ammo[c]);s.mag+=take;P.ammo[c]-=take;blip(520,.05,'square',.04)}}
  if(P.switchT>0)P.switchT-=dt;
  const can=P.reloadT<=0&&P.switchT<=0&&!P.sprint&&P.healT<=0&&P.repairT<=0&&P.alive&&!P.downed&&P.meleeT<=0&&!UI.invOpen&&!(M.countdown>0)&&!P.zip;
  if(s&&s.def&&(M.mode==='zombie'&&s.def.slot==='pistol'))P.ammo[s.def.ammo]=P.ammoCap[s.def.ammo];
  if(s&&s.knife){if(can&&(mouse.l||mouse.lPressed)&&P.fireT<=0){P.fireT=KNIFE.rate;P.meleeT=KNIFE.rate;P.meleeAnim=0;mouse.lPressed=false;doMelee()}}
  else if(s&&can&&P.fireT<=0&&(s.def.auto?(mouse.l||mouse.lPressed):mouse.lPressed))playerShoot();
  if(s&&!s.knife&&s.mag===0&&P.ammo[s.def.ammo]>0&&P.reloadT<=0&&P.fireT<-.2&&mouse.l)startReload();
  P.bloom=Math.max(0,P.bloom-dt*.1);
  if(P.fireT<-.12&&P.recoilDebt>0){const r=Math.min(P.recoilDebt,dt*.3);P.pitch-=r;P.recoilDebt-=r}
  P.kick*=Math.exp(-dt*11);P.vmKick*=Math.exp(-dt*16);P.shake*=Math.exp(-dt*7);P.dmgFlash=Math.max(0,P.dmgFlash-dt*1.2);
  // viewmodels
  const scoped=st&&st.scope&&P.adsK>.85;UI.scope(scoped);
  P.slots.forEach((x,i)=>{if(x)x.vm.g.visible=i===P.cur&&P.alive&&!P.downed&&!scoped});
  if(!s||!P.alive)return;const vm=s.vm;
  const p=_e1.copy(vm.hip).lerp(vm.ads,P.adsK);const mvK=clamp(P.speed/4.3,0,1.5)*(P.onGround?1:.2);
  p.x+=Math.sin(P.bob)*.011*mvK*(1-P.adsK*.85);p.y+=-Math.abs(Math.cos(P.bob))*.011*mvK*(1-P.adsK*.85);
  let rx=0,ry=0,rz=0;vm.sprintK=(vm.sprintK||0)+((P.sprint?1:0)-(vm.sprintK||0))*Math.min(1,dt*9);
  p.x+=.03*vm.sprintK;p.y-=.05*vm.sprintK;rx-=.35*vm.sprintK;ry+=.7*vm.sprintK;
  if(P.reloadT>0){const kk=Math.sin((1-P.reloadT/P.reloadDur)*Math.PI);p.y-=.07*kk;rx+=.45*kk;rz+=.5*kk;if(vm.mag)vm.mag.position.y=vm.magY-.12*Math.sin(clamp((1-P.reloadT/P.reloadDur)*2,0,1)*Math.PI)}else if(vm.mag)vm.mag.position.y=vm.magY;
  if(vm.pump){const kk=P.fireT>0?clamp(1-P.fireT/(60/st.rpm),0,1):1;vm.pump.position.z=vm.pumpZ+.09*Math.sin(clamp((kk-.25)/.6,0,1)*Math.PI)}
  if(P.switchT>0)p.y-=.28*(P.switchT/.42);if(P.healT>0||P.repairT>0){p.y-=.2;rx-=.4}
  if(s.knife&&P.meleeT>0){const kk=1-P.meleeT/KNIFE.rate;rx-=Math.sin(kk*Math.PI)*.9;ry+=Math.sin(kk*Math.PI)*.6;p.z-=Math.sin(kk*Math.PI)*.12}
  p.z+=.045*P.vmKick*(1-P.adsK*.5);rx+=.07*P.vmKick*(1-P.adsK*.6);
  vm.g.position.copy(p);vm.g.rotation.set(rx,ry,rz);
  P.flashT-=dt;if(vm.fl)vm.fl.visible=P.flashT>0;
  // quick melee shows knife briefly
  if(P.meleeT>0&&!s.knife){vm.g.visible=false;const kv=P.slots[3].vm;kv.g.visible=true;const kk=1-P.meleeT/KNIFE.rate;kv.g.position.set(.14,-.12,-.28-Math.sin(kk*Math.PI)*.12);kv.g.rotation.set(-Math.sin(kk*Math.PI)*.9,Math.sin(kk*Math.PI)*.6,0)}
}

/* ================= interaction ================= */
let IA={target:null,t:0};
function findInteract(){if(!P.alive||P.downed)return null;camFwd(_f);let best=null,bd=1e9;const cp=camera.position;
  const consider=(kind,pos,maxD,data,needFacing=true)=>{const dx=pos.x-P.pos.x,dz=pos.z-P.pos.z,dy=pos.y-(P.pos.y+1);const d=Math.hypot(dx,dz);if(d>maxD||Math.abs(dy)>2)return;
    if(needFacing&&d>1.1){const to=_e2.set(pos.x-cp.x,pos.y-cp.y,pos.z-cp.z).normalize();if(to.dot(_f)<.5)return}if(d<bd){bd=d;best={kind,pos,data,d}}};
  for(const c of W.containers)if(!c.searched)consider('loot',c.pos,2.4,c);
  for(const d of W.doors)consider('door',new T.Vector3(d.x,d.y+1.2,d.z),2.2,d);
  for(const s of W.switches)if(!s.on)consider('switch',s.pos,2.2,s);
  for(const e of W.extracts)if(e.type==='paid'&&!e.paid&&P.pos.distanceTo(e.pos)<e.r)consider('pay',new T.Vector3(e.pos.x,P.pos.y+1,e.pos.z),e.r+.5,e,false);
  if(typeof netPuppets!=='undefined')for(const k in netPuppets){const p=netPuppets[k];if(p.downed&&p.alive)consider('revive',new T.Vector3(p.pos.x,p.pos.y+.5,p.pos.z),2.2,k,false)}
  for(const pk of W.pickups)if(!pk.taken)consider('pickup',pk.pos,2.2,pk,false);
  for(const z of W.ziplines)consider('zip',new T.Vector3(z.start.x,z.start.y+1,z.start.z),2.4,z,false);
  for(const a of W.ammoSt)consider('ammo',a.pos,2.4,a);
  return best}
function interactInfo(t){if(!t)return null;switch(t.kind){
  case 'loot':{const c=t.data;const nm={crate:'物資箱',weapon:'武器箱',med:'醫療箱',safe:'保險櫃',vault:'金庫寶箱',pc:'電腦主機',airdrop:'空投箱',body:'遺體'}[c.type]||'容器';return{label:(c.items?'拿取剩餘物品 · ':'搜索')+nm,time:c.items?.35:c.time,hold:true}}
  case 'door':{const d=t.data;if(d.locked)return{label:(hasKey(d.locked)?'使用':'需要')+(d.locked==='R'?'紅色':'藍色')+'鑰匙卡',time:hasKey(d.locked)?1.2:0,hold:hasKey(d.locked)};return{label:d.open?'關門':'開門',time:0,hold:false}}
  case 'switch':return{label:'拉下電閘（會觸發警報）',time:2.5,hold:true};
  case 'pay':{const e=t.data;return{label:`支付 ${fmt(e.cost)} 啟用付費撤離（倉庫餘額 ${fmt(PF.money)}）`,time:1.5,hold:true}}
  case 'revive':return{label:'救起隊友',time:4,hold:true};
  case 'pickup':return{label:'撿起 '+WEAPONS[t.data.wid].name,time:0,hold:false};
  case 'zip':return{label:'搭乘滑索',time:0,hold:false};
  case 'ammo':return t.data.cd>0?{label:`彈藥補給冷卻 ${Math.ceil(t.data.cd)} 秒`,time:0,hold:false}:{label:'補充彈藥',time:.6,hold:true};}}
function tapInteract(){const t=findInteract();if(!t)return;const info=interactInfo(t);
  if(t.kind==='pickup'){pickupWeapon(t.data);return}if(t.kind==='zip'){startZip(t.data);return}if(!info.hold&&t.kind==='door'&&!t.data.locked){toggleDoor(t.data);if(M.net)netSend({t:'door',i:W.doors.indexOf(t.data),o:t.data.open})}}
function updateInteract(dt){
  const t=findInteract();const info=interactInfo(t);
  if(!t||(IA.target&&t.data!==IA.target.data)){IA.t=0}
  IA.target=t;
  const holding=keys.KeyE;
  if(t&&info.hold){if(holding){IA.t+=dt;if(IA.t>=info.time){IA.t=0;completeInteract(t)}}else IA.t=Math.max(0,IA.t-dt*2)}
  UI.prompt(t?info.label:null,t&&info.hold?IA.t/info.time:0,t&&!info.hold,t)}
function completeInteract(t){const d=t.data;switch(t.kind){
  case 'loot':openContainer(d);break;
  case 'door':if(d.locked&&hasKey(d.locked)){d.locked=null;toggleDoor(d);note('門鎖已解除');if(M.net)netSend({t:'unlock',i:W.doors.indexOf(d)})}break;
  case 'switch':d.on=true;d.lever.rotation.x=-.6;d.led.material.color.setHex(0x30ff60);activatePower();if(M.net)netSend({t:'power'});break;
  case 'pay':if(PF.money>=d.cost){PF.money-=d.cost;savePF();d.paid=true;d.active=true;banner('付費撤離已啟用',d.name,2);blip(880,.1,'square',.05)}else note('倉庫資金不足');break;
  case 'revive':if(typeof netSend==='function')netSend({t:'revive',to:d});note('已救起隊友');break;
  case 'ammo':if(d.cd>0)break;for(const k in P.ammo)P.ammo[k]=P.ammoCap[k];if(invCount('nade')<2)invAdd('nade');d.cd=45;if(d.strip>=0){_tc.setHex(0x3a3a34);W.stripMesh.setColorAt(d.strip,_tc);W.stripMesh.instanceColor.needsUpdate=true}note('彈藥已補滿');blip(700,.08,'square',.05);blip(1000,.08,'square',.05,0,.08);break}}
function tryVault(){camFwd(_f);const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);const feet=P.pos.y;
  for(const dist of [.6,.9]){const x=P.pos.x+fx*dist,z=P.pos.z+fz*dist;const q=gridQuery(x-.2,z-.2,x+.2,z+.2);
    for(const b of q){if(b.off||!b.solid||b.kind==='lift')continue;if(!(x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ))continue;const top=b.maxY-feet;if(top<.5||top>1.75||b.minY>feet+.45)continue;
      const tx=P.pos.x+fx*(dist+.55),tz=P.pos.z+fz*(dist+.55);if(ceilingHit(tx,tz,.3,b.maxY,b.maxY+1.7))return false;
      for(const c of gridQuery(tx-.3,tz-.3,tx+.3,tz+.3))if(!c.off&&c.solid&&c!==b&&blocks(c,tx,tz,.3,b.maxY,b.maxY+1.7))return false;
      P.vault={a:P.pos.clone(),b:new T.Vector3(tx,b.maxY,tz),t:0,dur:.38};noiseHit(.2,600,.12);return true}}return false}
function pickupWeapon(pk){if(pk.taken)return;const w=WEAPONS[pk.wid];let slot=w.slot==='pistol'?2:(!P.slots[0]?0:!P.slots[1]?1:(P.cur<2?P.cur:0));
  const old=P.slots[slot];if(old&&old.def)dropWeapon(old.wid,P.pos);if(old&&old.vm)vmScene.remove(old.vm.g);
  const ns=makeSlot(pk.wid);ns.mag=pk.mag!=null?Math.min(pk.mag,ns.st.mag):ns.st.mag;P.slots[slot]=ns;P.ammo[w.ammo]=Math.min(P.ammoCap[w.ammo],P.ammo[w.ammo]+(pk.reserve||ns.st.mag*2));
  pk.taken=true;scene.remove(pk.g);P.cur=slot;P.switchT=.42;P.ads=false;buildSlotButtons();note('撿起 '+w.name);blip(700,.06,'square',.04)}
const pkMat=new T.MeshStandardMaterial({color:0x2a2b27,roughness:.5,metalness:.5});
function dropWeapon(wid,pos,mag){if(!wid||!WEAPONS[wid]||WEAPONS[wid].free&&M.mode==='extract')return;const g=new T.Group();const m=new T.Mesh(new T.BoxGeometry(.12,.12,WEAPONS[wid].slot==='pistol'?.3:.9),pkMat);m.position.y=.12;g.add(m);
  const glow=new T.Sprite(new T.SpriteMaterial({map:softTex,color:0xffb547,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.6}));glow.scale.set(1.2,1.2,1.2);glow.position.y=.3;g.add(glow);
  g.position.set(pos.x+rnd(-.5,.5),pos.y,pos.z+rnd(-.5,.5));g.rotation.y=Math.random()*TAU;scene.add(g);(W.dynObjs||(W.dynObjs=[])).push(g);
  W.pickups.push({wid,g,pos:new T.Vector3(g.position.x,g.position.y+.4,g.position.z),mag,taken:false,reserve:null});if(W.pickups.length>40){const o=W.pickups.shift();scene.remove(o.g)}}
function startZip(z){P.zip={z,t:0};P.vel.set(0,0,0);noiseHit(.6,2500,.15,0,1200);P.ads=false}
function updateZip(dt){const z=P.zip.z;P.zip.t+=dt*13/z.L;const k=Math.min(1,P.zip.t);P.pos.lerpVectors(z.a,z.b,k);P.pos.y-=1.75;P.speed=8;
  if(k>=1||keys.Space){P.zip=null;P.vy=0;P.onGround=false;P.fallStart=P.pos.y}}
function activatePower(){if(W.power)return;W.power=true;for(const e of W.extracts)if(e.type==='power')e.active=true;if(W.powerGate){W.powerGate.off=true;W.powerGate.mesh.visible=false}
  banner('電力已恢復','電動閘門撤離點已開放',2.4);if(!M.alarmT&&M.mode==='extract'){M.alarmT=20;alertNoise(P.pos,80,P.pos);if(!M.net||M.isHost)spawnSquad(3,P.pos,35,55)}}

/* ================= loot rolling ================= */
const RW=[40,25,14,8,4,1.5,.4];
function rollValuable(bias=0,pool=VALUABLES){const ws=pool.map(id=>RW[ITEMS[id].r]*Math.pow(1+bias,ITEMS[id].r));let s=ws.reduce((a,b)=>a+b,0),r=Math.random()*s,k=0;while(k<ws.length-1&&r>ws[k]){r-=ws[k];k++}return pool[k]}
function carriedCals(){const c=[];for(const s of P.slots)if(s&&s.def&&!c.includes(s.def.ammo))c.push(s.def.ammo);return c.length?c:['556']}
function ammoEntry(cal){const n={'556':[25,45],'762':[20,35],'9mm':[25,45],'12g':[6,12],'338':[4,8],'50ae':[7,14]}[cal];return{ammo:cal,n:Math.round(rnd(...n))}}
function rollContents(c){const L=DIFFS[M.diff].loot,out=[],V=n=>{for(let i=0;i<n;i++)out.push({id:rollValuable(L-1+(c.bias||0))})},I=id=>out.push({id}),A=()=>out.push(ammoEntry(pick(carriedCals())));
  switch(c.type){
  case 'crate':V(1+(Math.random()*2.2|0));if(Math.random()<.5)A();if(Math.random()<.25)I('med');if(Math.random()<.15)I('nade');if(Math.random()<.04)I('flare');break;
  case 'weapon':A();A();if(Math.random()<.5)I('nade');if(Math.random()<.3)I('nade');if(Math.random()<.1)I('flare');if(Math.random()<.4)V(1);break;
  case 'med':I('med');if(Math.random()<.5)I('med');if(Math.random()<.3)I('surg');if(Math.random()<.35)I('repair');break;
  case 'safe':c.bias=.9;V(2+(Math.random()*2|0));if(Math.random()<.12)I('keyB');if(Math.random()<.05)I('keyR');break;
  case 'pc':for(let i=0;i<1+(Math.random()*2|0);i++)I(rollValuable(L-.5,['parts','usb','gpu','tablet','hdd','phone','server']));break;
  case 'vault':c.bias=1.6;V(4);if(Math.random()<.3)I('core');break;
  case 'airdrop':c.bias=1.2;V(5);I('surg');I('nade');I('nade');A();A();if(Math.random()<.5)I('flare');break;
  case 'body':{const k=c.bot.kind;A();if(Math.random()<.22)I('med');if(k==='boss'){I('hdd');I('gold');if(Math.random()<.5)I('keyR');I('flare')}else if(Math.random()<(k==='heavy'?.8:k==='sniper'?.6:.35)){c.bias=k==='heavy'?.6:.2;V(1)}if(Math.random()<.06)I('keyB');break}}
  return out}
function openContainer(c){
  if(!c.items){c.items=rollContents(c);if(c.box&&c.type!=='body'){}M.stats.searched++}
  const lines=[];const sorted=c.items.slice().sort((a,b)=>(b.id?ITEMS[b.id].v/ITEMS[b.id].s:0)-(a.id?ITEMS[a.id].v/ITEMS[a.id].s:0));const left=[];
  for(const it of sorted){if(it.ammo){const cap=P.ammoCap[it.ammo]-P.ammo[it.ammo];const take=Math.min(cap,it.n);if(take>0){P.ammo[it.ammo]+=take;lines.push([`${AMMO[it.ammo].name} +${take}`,'#efe7d6',''])}if(take<it.n)left.push({ammo:it.ammo,n:it.n-take});continue}
    const where=invAdd(it.id);if(where)lines.push([ITEMS[it.id].name,RARITY[ITEMS[it.id].r],ITEMS[it.id].use?'':fmt(ITEMS[it.id].v)]);else left.push(it)}
  c.items=left;
  if(!left.length){c.searched=true;setStripC(c,0x3a3a34)}else{lines.push(['空間不足，有物品留在容器內','#ff4b3e','']);setStripC(c,0xff4b3e)}
  if(!lines.length)lines.push(['空的','#a99f8a','']);
  lootToast(lines);blip(880,.06,'square',.04);blip(1320,.08,'square',.04,0,.07)}
function setStripC(c,col){if(c.strip>=0)setStrip(c,col)}
