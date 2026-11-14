'use strict';
/* ================= phase 3 gameplay: special extractions · treasure · vehicles · emotes · cinematics · quests ================= */

/* ---------- special extraction tasks ---------- */
function taskOK(e){const t=e.task;if(!t)return true;if(t.kind==='window'){const hr=M.clock%24;return t.from.some(f=>hr>=f&&hr<f+t.dur)}return!!t.ready}
function taskHint(e){const t=e.task;if(t.kind==='window'){const hr=M.clock%24;const next=t.from.map(f=>f>hr?f:f+24).sort((a,b)=>a-b)[0];const mins=Math.round((next-hr)*60);return`${t.label} · 下一班約 ${Math.floor(mins/60)} 小時 ${mins%60} 分後（遊戲時間）`}
  if(t.kind==='hold')return t.label+(t.prog?` · 進度 ${Math.round(t.prog/t.need*100)}%`:'');if(t.kind==='switches')return t.label+(t.on?` · 已拉 ${t.on}/${t.n}`:'')+(t.waitT>0?` · 剩 ${Math.ceil(t.waitT)} 秒`:'');return t.label}
function taskSwitch(s,local){const e=s.task,t=e.task;t.on=(t.on||0)+1;banner('閘門開關 '+t.on+'/'+t.n,t.on>=t.n?'撤離通道將在 '+t.wait+' 秒後開啟':'',1.8);if(t.on>=t.n)t.waitT=t.wait;if(local&&M.net)netSend({t:'task',k:'sw',i:W.switches.indexOf(s)})}
function termDone(t,local){t.done=true;if(t.kind==='decrypt'){W.decrypted=true;banner('解密完成','現在可以去管道閘門控制室拉閘',2)}if(local&&M.net)netSend({t:'task',k:'term',i:W.terms.indexOf(t)});blip(1200,.2,'square',.05)}
function updateTasks(dt){for(const e of W.extracts){const t=e.task;if(!t)continue;
    if(t.kind==='hold'&&!t.ready){const inA=P.alive&&!P.downed&&Math.hypot(P.pos.x-t.x,P.pos.z-t.z)<t.r;if(inA){t.prog=(t.prog||0)+dt;if(M.frame%8===0)UI.exfil(`${t.label} · ${Math.round(t.prog/t.need*100)}%`,t.prog/t.need,true);if(t.prog>=t.need){t.ready=true;banner(e.name+' 已開啟','',2.2);if(M.net)netSend({t:'task',k:'ready',i:W.extracts.indexOf(e)})}}}
    if(t.kind==='switches'&&t.waitT>0){t.waitT-=dt;if(t.waitT<=0){t.ready=true;banner(e.name+' 已開啟','',2.2)}}}}
function onTaskMsg(m){if(m.k==='sw'){const s=W.switches[m.i];if(s&&!s.on){s.on=true;s.lever.rotation.x=-.6;taskSwitch(s,false)}}else if(m.k==='term'){const t=W.terms[m.i];if(t&&!t.done)termDone(t,false)}else if(m.k==='ready'){const e=W.extracts[m.i];if(e&&e.task)e.task.ready=true}}

/* ---------- buried treasure ---------- */
function buriedHere(){return(PF.buried||[]).filter(b=>b.map===W.id)}
function setupBuried(){W.buried=[];for(const b of buriedHere()){let x=b.x,z=b.z;for(let i=0;i<40&&!isFree(x,z,.5);i++){x=b.x+rnd(-6,6);z=b.z+rnd(-6,6)}
  const y=groundAt(x,z,.3,40);const m=new T.Mesh(new T.SphereGeometry(.7,10,6,0,TAU,0,Math.PI/2),new T.MeshStandardMaterial({color:0x5a4a32,roughness:1}));m.scale.y=.35;m.position.set(x,y,z);addObj(m);
  W.buried.push({ref:b,pos:new T.Vector3(x,y+.3,z),m,dug:false})}}
function canBury(){return M.mode==='extract'&&P.alive&&!P.downed&&!waterAt(P.pos.x,P.pos.z)&&(PF.buried||[]).length<5}
function buryItem(it){if(!canBury()){note((PF.buried||[]).length>=5?'最多只能同時埋 5 件物品':'這裡不能埋東西');return false}
  PF.buried=PF.buried||[];PF.buried.push({map:W.id,x:+P.pos.x.toFixed(1),z:+P.pos.z.toFixed(1),it:serItem(it),name:itemName(it),t:Date.now()});savePF();
  const m=new T.Mesh(new T.SphereGeometry(.7,10,6,0,TAU,0,Math.PI/2),new T.MeshStandardMaterial({color:0x5a4a32,roughness:1}));m.scale.y=.35;m.position.set(P.pos.x,P.pos.y,P.pos.z);addObj(m);
  emit(new T.Vector3(P.pos.x,P.pos.y+.3,P.pos.z),18,'dust',3,.8,.08);note(`已把 ${itemName(it)} 埋在這裡，下次來 ${MAPS[W.id].name} 可以挖出來`);return true}
function digUp(b){if(b.treasure){digTreasure(b);return}b.dug=true;scene.remove(b.m);PF.buried=(PF.buried||[]).filter(x=>x!==b.ref);savePF();const o=b.ref.it;
  const c=makeDropC(b.pos.x,b.pos.y-.3,b.pos.z,'drop',(NET.myId||'me')+':dig'+(dropSeq++));c.grid.items=[];giPut(c.grid,deItem(o));emit(b.pos.clone(),20,'dust',4,.8,.08);openLoot(c)}

/* ---------- vehicles ---------- */
const CAR_COL=[0x7a2a20,0x2a4a6a,0x4a5536,0xc8c4b8,0x2a2a2a,0xb08a2a];
function garage(x,z,rot){const w=7,d=9;if(!isFree(x,z,5))return;
  if(rot){const back=z>0?1:-1;sbox(x-w/2,z,.3,d,3.4,'dark',0);sbox(x+w/2,z,.3,d,3.4,'dark',0);sbox(x,z+back*d/2,w,.3,3.4,'dark',0);sbox(x,z,w+.4,d+.4,.3,'roof',3.4);landmark('車庫',x,z,6);spawnCar(x,z,back>0?Math.PI:0)}
  else{const back=x>0?1:-1;sbox(x,z-w/2,d,.3,3.4,'dark',0);sbox(x,z+w/2,d,.3,3.4,'dark',0);sbox(x+back*d/2,z,.3,w,3.4,'dark',0);sbox(x,z,d+.4,w+.4,.3,'roof',3.4);landmark('車庫',x,z,6);spawnCar(x,z,back>0?-Math.PI/2:Math.PI/2)}}
function carMesh(col){const g=new T.Group();const body=new T.MeshStandardMaterial({color:col,roughness:.45,metalness:.5}),dark=new T.MeshStandardMaterial({color:0x151515,roughness:.3,metalness:.2}),glass=new T.MeshStandardMaterial({color:0x223038,roughness:.1,metalness:.6});
  const B=(w,h,d,m,x,y,z)=>{const q=new T.Mesh(new T.BoxGeometry(w,h,d),m);q.position.set(x,y,z);q.castShadow=true;g.add(q);return q};
  B(1.9,.7,4.3,body,0,.75,0);B(1.7,.6,2.2,glass,0,1.38,-.2);B(1.72,.08,2.1,body,0,1.7,-.2);B(1.95,.25,.3,dark,0,.55,2.15);B(1.95,.25,.3,dark,0,.55,-2.15);
  for(const s of [-1,1]){const hl=B(.35,.15,.05,new T.MeshBasicMaterial({color:0xfff2c0}),s*.65,.85,2.16);const tl=B(.35,.12,.05,new T.MeshBasicMaterial({color:0xff2a1a}),s*.65,.85,-2.16)}
  const wheels=[];for(const s of [-1,1])for(const t of [-1,1]){const w=new T.Mesh(new T.CylinderGeometry(.38,.38,.28,14).rotateZ(Math.PI/2),dark);w.position.set(s*.95,.38,t*1.35);w.castShadow=true;g.add(w);wheels.push(w)}
  g.userData.wheels=wheels;return g}
function spawnCar(x,z,yaw){const id=(W.cars||(W.cars=[])).length;const g=carMesh(CAR_COL[id%CAR_COL.length]);g.position.set(x,terrH(x,z),z);g.rotation.y=yaw;addObj(g);
  const c={id,g,pos:g.position,yaw,spd:0,hp:300,name:['越野車','皮卡','吉普車','廂型車'][id%4],driver:null,net:null,dead:false};W.cars.push(c);return c}
function enterCar(c){if(c.dead||c.driver)return;P.car=c;c.driver='me';P.ads=false;P.sprint=false;note(c.kind==='jet'?'戰鬥機：W 加油門 · S 減速 · 滑鼠左右轉向 · 空白鍵拉高 · C 壓低 · 左鍵機砲 · 右鍵導引飛彈 · F 彈射（先按 W 助跑到 45 m/s 以上，再按空白鍵起飛）':c.kind==='tank'?'坦克：WASD 移動 · 滑鼠轉砲塔 · 左鍵開砲 · F 下車':c.kind==='heli'?'直升機：WASD 平移 · 空白鍵上升 · C 下降 · 滑鼠轉向 · 左鍵機砲 · F 跳機':'駕駛中：WASD 駕駛 · 空白鍵煞車 · F 下車');blip(160,.3,'sawtooth',.05)}
function exitCar(){const c=P.car;if(!c)return;if(c.kind==='jet'){if(c.pos.y>terrH(c.pos.x,c.pos.z)+4||c.dead){jetEject(c);return}c.spd=0}if(c.kind==='heli'&&c.pos.y>groundAt(c.pos.x,c.pos.z,2,c.pos.y)+3){P.pos.set(c.pos.x,c.pos.y-1.5,c.pos.z);c.driver=null;P.car=null;c.vy=-3;return}const sx=Math.cos(c.yaw)*2.2,sz=-Math.sin(c.yaw)*2.2;let x=c.pos.x+sx,z=c.pos.z+sz;if(!isFree(x,z,.4)){x=c.pos.x-sx;z=c.pos.z-sz}P.pos.set(x,groundAt(x,z,.3,c.pos.y+2),z);P.vel.set(0,0,0);c.driver=null;c.spd=0;P.car=null;if(M.net)netSend({t:'car',id:c.id,x:+c.pos.x.toFixed(2),y:+c.pos.y.toFixed(2),z:+c.pos.z.toFixed(2),yw:+c.yaw.toFixed(2),d:0})}
function updateCar(dt){const c=P.car;if(!c)return false;if(c.dead||!P.alive||P.downed){exitCar();return false}if(c.kind){updateArmor(c,dt);return true}
  let th=0,st=0;if(keys.KeyW)th=1;if(keys.KeyS)th=-1;if(keys.KeyA)st=1;if(keys.KeyD)st=-1;if(touchS.stickId!==null){th=-touchS.jy;st=-touchS.jx}
  const max=th<0?-7:19;c.spd+=th*(th>0?9:12)*dt;c.spd=clamp(c.spd,-7,max);if(!th)c.spd*=1-dt*.8;if(keys.Space)c.spd*=1-dt*4;
  c.yaw+=st*dt*Math.min(1.6,Math.abs(c.spd)*.18)*Math.sign(c.spd||1);const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);
  const ox=c.pos.x,oz=c.pos.z;moveCircle(c.pos,fx*c.spd*dt,fz*c.spd*dt,1.25,c.pos.y,c.pos.y+1.6);const moved=Math.hypot(c.pos.x-ox,c.pos.z-oz);if(Math.abs(c.spd)>3&&moved<Math.abs(c.spd)*dt*.4){if(Math.abs(c.spd)>9){carDamage(c,Math.abs(c.spd)*3);P.shake=1}c.spd*=-.25}
  const gy=groundAt(c.pos.x,c.pos.z,1,c.pos.y+.8);c.pos.y+=(gy-c.pos.y)*Math.min(1,dt*10);c.g.rotation.y=c.yaw;for(const w of c.g.userData.wheels)w.rotation.x+=c.spd*dt/.38;
  // run over enemies
  if(Math.abs(c.spd)>5)for(const b of bots){if(b.dead||!hostile(P.team,b.team))continue;if(Math.hypot(b.pos.x-c.pos.x-fx*1.6,b.pos.z-c.pos.z-fz*1.6)<1.7&&!b._hitCar){b._hitCar=1;damageBot(b,Math.abs(c.spd)*9,'body',{player:true,pos:P.pos,how:c.name},null);later(.6,()=>b._hitCar=0)}}
  P.pos.set(c.pos.x,c.pos.y+.4,c.pos.z);P.vel.set(fx*c.spd,0,fz*c.spd);P.speed=Math.abs(c.spd);if(Math.abs(c.spd)>4)alertNoise(c.pos,40,c.pos);
  if(!c._snd||M.t-c._snd>.25){c._snd=M.t;gunSnd(.05+Math.abs(c.spd)*.004,60+Math.abs(c.spd)*7,.25,0)}
  return true}
function carDamage(c,d){c.hp-=d;if(c.hp<=0&&!c.dead){c.dead=true;if(c.kind==='jet'){later(.4,()=>{if(c.dead)c.g.visible=false});if(c.ai)banner(c.team===P.team?'我方戰鬥機被擊落':'擊落敵方戰鬥機','',1.6)}explode(c.pos.clone().setY(c.pos.y+1),6,180,{});c.g.traverse(o=>{if(o.material&&o.material.color)o.material.color.multiplyScalar(.25)});if(P.car===c)exitCar()}}
function carCam(){const c=P.car;if(c.kind){armorCam(c);return}const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);const want=new T.Vector3(c.pos.x-fx*7.5,c.pos.y+3.4,c.pos.z-fz*7.5);camera.position.lerp(want,.25);camera.lookAt(c.pos.x+fx*4,c.pos.y+1.2,c.pos.z+fz*4)}
function onCarMsg(m){const c=(W.cars||[])[m.id];if(!c)return;c.net={x:m.x,y:m.y,z:m.z,yw:m.yw,pt:m.pt||0,rl:m.rl||0};c.driver=m.d?m.from:null}
function updateRemoteCars(dt){for(const c of W.cars||[]){if(c.kind==='heli'&&c.driver!=='me'&&!c.dead){if(c.driver)for(const r of c.g.userData.rot||[])r.rotation.y+=dt*30;else if(!c.net&&c.pos.y>groundAt(c.pos.x,c.pos.z,2,c.pos.y)+1){c.pos.y=Math.max(groundAt(c.pos.x,c.pos.z,2,c.pos.y)+.9,c.pos.y-dt*6)}}if(c.driver==='me'||!c.net)continue;const a=Math.min(1,dt*10);c.pos.x=lerp(c.pos.x,c.net.x,a);c.pos.y=lerp(c.pos.y,c.net.y,a);c.pos.z=lerp(c.pos.z,c.net.z,a);c.yaw+=angDiff(c.net.yw,c.yaw)*a;if(c.kind==='jet'){c.pitch=c.net.pt;c.roll=c.net.rl;jetPose(c)}else c.g.rotation.y=c.yaw}}
function carNetTick(){const c=P.car;if(c&&M.net&&M.frame%3===0)netSend({t:'car',id:c.id,x:+c.pos.x.toFixed(2),y:+c.pos.y.toFixed(2),z:+c.pos.z.toFixed(2),yw:+c.yaw.toFixed(2),pt:+(c.pitch||0).toFixed(2),rl:+(c.roll||0).toFixed(2),d:1})}
function setupGarages(){const h=W.half;const spots=[[-h+14,-h/2,false],[h-14,h/2,false],[-h/2,h-14,true],[h/2,-h+14,true]];let n=0;for(const [x,z,r] of spots){if(n>=3)break;if(isFree(x,z,6)){garage(x,z,r);n++}}}

/* ---------- emotes (third-person) ---------- */
const EMOTES=[['dance','跳舞'],['sing','唱歌'],['eat','吃東西'],['drink','喝水'],['cards','打牌']];
function openEmotes(){if(!M.running||!P.alive||P.downed||P.car)return;const el=$('emoteWheel');el.hidden=!el.hidden;if(!el.hidden){el.innerHTML=EMOTES.map(([k,l],i)=>`<button type="button" data-e="${k}"><kbd>${i+1}</kbd>${l}</button>`).join('');unlockPointer()}else lockPointer()}
$('emoteWheel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;startEmote(b.dataset.e)});
function startEmote(k){$('emoteWheel').hidden=true;lockPointer();if(!P.alive||P.downed||P.car)return;P.emote=k;P.emoteT=0;P.ads=false;if(!P.rig){P.rig=makeRig({op:P.op,skin:P.skin,team:P.team,wid:'knife'});scene.add(P.rig.root)}P.rig.root.visible=true;note('按任意移動鍵結束動作');if(k==='sing')for(let i=0;i<6;i++)blip(440*Math.pow(2,[0,4,7,4,9,7][i]/12),.25,'triangle',.05,0,i*.3)}
function stopEmote(){if(!P.emote)return;P.emote=null;if(P.rig)P.rig.root.visible=false}
function updateEmote(dt){if(!P.emote)return false;if(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.Space||mouse.l||!P.alive||P.downed||(touchS.stickId!==null&&Math.hypot(touchS.jx,touchS.jy)>.3)){stopEmote();return false}
  P.emoteT+=dt;const R=P.rig;R.root.position.copy(P.pos);R.root.rotation.y=P.yaw+Math.PI;rigAnimate(R,{spd:0,emote:P.emote,emoteT:P.emoteT,crouch:P.emote==='cards'},dt);
  const a=P.yaw+Math.PI+P.emoteT*.25,d=3.4;camera.position.set(P.pos.x+Math.sin(a)*d,P.pos.y+1.9,P.pos.z+Math.cos(a)*d);camera.lookAt(P.pos.x,P.pos.y+1.1,P.pos.z);P.vel.set(0,0,0);return true}

/* ---------- deploy / extraction cinematics ---------- */
let heliProp=null;
function heliModel(){const g=new T.Group();const m=new T.MeshStandardMaterial({color:0x3a4234,roughness:.6,metalness:.4});const B=(w,h,d,x,y,z)=>{const q=new T.Mesh(new T.BoxGeometry(w,h,d),m);q.position.set(x,y,z);g.add(q);return q};
  B(2.4,2,5,0,0,0);B(.6,.6,5,0,.4,-4.5);B(.2,1.4,1,0,1,-6.8);const rot=B(11,.05,.35,0,1.25,0);const rot2=B(.35,.05,11,0,1.25,0);g.userData.rot=[rot,rot2];B(.1,.6,.1,0,1,0);
  const gl=new T.Mesh(new T.BoxGeometry(2,1,1.4),new T.MeshStandardMaterial({color:0x223038,roughness:.1,metalness:.6}));gl.position.set(0,.3,2.4);g.add(gl);for(const s of [-1,1])B(.12,.12,4,s*1.1,-1.2,0);scene.add(g);return g}
function startIntro(){$('cine').hidden=true;if(M.mode!=='extract')return;M.intro=4;$('cine').hidden=false;const ev=M.event?EVENTS[M.event]:null;
  $('cineT').textContent=MAPS[W.id].name;$('cineS').textContent=`部署中 · ${clockStr()} · ${WEATHERS[W.weather].name}${ev?' · 本局事件：'+ev.name:''}`;
  heliProp=heliModel();heliProp.position.set(P.pos.x-Math.sin(P.yaw)*-20,40,P.pos.z);if(typeof rotorSound==='function')try{rotorSound(1)}catch(e){}}
function updateIntro(dt){if(!(M.intro>0))return false;M.intro-=dt;const k=1-Math.max(0,M.intro)/4;const e=1-Math.pow(1-k,3);
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);const start=new T.Vector3(P.pos.x-fx*30,P.pos.y+38,P.pos.z-fz*30),end=new T.Vector3(P.pos.x,P.pos.y+P.eyeH(),P.pos.z);camera.position.lerpVectors(start,end,e);
  camera.lookAt(P.pos.x+fx*(20*e+2),P.pos.y+1.5*e,P.pos.z+fz*(20*e+2));
  if(heliProp){heliProp.position.set(P.pos.x-fx*(30-40*k),P.pos.y+30-14*k,P.pos.z-fz*(30-40*k));heliProp.rotation.y=Math.atan2(fx,fz);for(const r of heliProp.userData.rot)r.rotation.y+=dt*30}
  if(M.intro<=0){$('cine').hidden=true;if(heliProp){scene.remove(heliProp);heliProp=null}if(M.event)banner('本局事件：'+EVENTS[M.event].name,EVENTS[M.event].desc,3)}return M.intro>0}
function startOutro(e){if(M.outro>0||M.ending)return;M.outro=3.2;M.outroE=e;P.buff.godT=Math.max(P.buff.godT,6);if(P.car)exitCar();stopEmote();$('cine').hidden=false;$('cineT').textContent='撤離成功';$('cineS').textContent=e.name;heliProp=heliModel();heliProp.position.set(P.pos.x,P.pos.y+14,P.pos.z);blip(660,.3,'triangle',.06);blip(880,.4,'triangle',.06,0,.2)}
function updateOutro(dt){if(!(M.outro>0))return false;M.outro-=dt;const k=1-M.outro/3.2;camera.position.set(P.pos.x+Math.sin(k*2)*8,P.pos.y+2+k*18,P.pos.z+Math.cos(k*2)*8);camera.lookAt(P.pos.x,P.pos.y+1+k*10,P.pos.z);
  if(heliProp){heliProp.position.set(P.pos.x,P.pos.y+4+k*24,P.pos.z);for(const r of heliProp.userData.rot)r.rotation.y+=dt*30}
  if(M.outro<=0){$('cine').hidden=true;if(heliProp){scene.remove(heliProp);heliProp=null}endRaid('win',M.outroE)}return true}

/* ---------- quests (委託) ---------- */
const EX_MAPS=()=>Object.keys(MAPS).filter(k=>MAPS[k].extract!==false&&!MAPS[k].hidden);
function newQuest(){const r=Math.random(),mp=pick(EX_MAPS()),M_=MAPS[mp].name;
  if(r<.18){const n=pick([8,12,16,20]);return{type:'kill',n,prog:0,reward:n*30000,desc:`擊殺 ${n} 名敵人（任何地圖）`}}
  if(r<.28)return{type:'boss',n:1,prog:0,reward:900000,desc:'擊殺 1 名守軍頭目'};
  if(r<.42){const n=pick([6,9,12]);return{type:'search',map:mp,n,prog:0,reward:n*40000,desc:`在${M_}搜索 ${n} 個容器`}}
  if(r<.56)return{type:'extract',map:mp,n:1,prog:0,reward:350000,desc:`從${M_}成功撤離`};
  if(r<.68){const v=pick([2e6,5e6,1e7]);return{type:'value',n:v,prog:0,reward:Math.round(v*.12),desc:`單局帶出價值 ${fmt(v)} 以上`}}
  if(r<.82){const L=QUEST_LM[mp]||['中心區'];const lm=pick(L);return{type:'visit',map:mp,lm,n:1,prog:0,reward:450000,desc:`前往${M_}的「${lm}」偵察並撤離`}}
  if(r<.92){const n=pick([5,10]);return{type:'heads',n,prog:0,reward:n*45000,desc:`爆頭擊殺 ${n} 次`}}
  return{type:'red',n:1,prog:0,reward:1200000,desc:'帶出 1 件大紅物品'}}
const QUEST_LM={town:['裝甲工廠','博物館','集市','污水廠'],dam:['行政樓','水泥廠','軍營','遊客中心'],valley:['海景飯店','墜機點','雷達站','瀑布軍火庫','長風列車站'],space:['發射台','離心機室','中控室','黑室'],
  prison:['中央放風場','醫務翼','海溝','管道閘門控制室'],nuclear:['1號反應爐','冷卻塔','廢料庫','污水淨化站'],forest:['伐木營地','岩洞','護林塔'],desert:['綠洲','沙海神殿','殘骸車隊'],frost:['研究站','毒氣實驗室'],tower:['台北101','觀景台','高架快速道路']};
function ensureQuests(){const LQ=liveQuest();PF.quests=(PF.quests||[]).filter(q=>q&&q.desc&&(q.live==null||(LQ&&q.live===LQ.live)));if(LQ&&!PF.quests.some(q=>q.live===LQ.live)&&!(PF.liveDone||[]).includes(LQ.live))PF.quests.unshift(LQ);while(PF.quests.length<3)PF.quests.push(newQuest())}
function updateVisits(){if(M.mode!=='extract'||!W.landmarks||M.frame%15)return;M.visited=M.visited||new Set();for(const l of W.landmarks)if(!M.visited.has(l.name)&&Math.hypot(P.pos.x-l.x,P.pos.z-l.z)<Math.max(8,l.r*.6)){M.visited.add(l.name);note('抵達：'+l.name)}}
function questsAfterRaid(win,res){if(M.mode!=='extract')return[];ensureQuests();const done=[];const reds=(res.items||[]).filter(id=>ITEMS[id]&&ITEMS[id].r>=5).length;
  for(const q of PF.quests){const m=!q.map||q.map===M.map;switch(q.type){
    case 'kill':q.prog+=M.stats.kills;break;case 'heads':q.prog+=M.stats.heads;break;case 'boss':q.prog+=M.stats.boss||0;break;
    case 'search':if(m)q.prog+=M.stats.searched;break;case 'extract':if(m&&win)q.prog++;break;case 'value':if(win)q.prog=Math.max(q.prog,res.value);break;
    case 'visit':if(m&&win&&M.visited&&M.visited.has(q.lm))q.prog=1;break;case 'red':if(win)q.prog+=reds;break;case 'hack':if(win)q.prog+=M.stats.hacks||0;break}
    if(q.prog>=q.n){done.push(q);PF.money+=q.reward;if(q.live!=null)(PF.liveDone||(PF.liveDone=[])).push(q.live)}}
  PF.quests=PF.quests.filter(q=>!done.includes(q));ensureQuests();return done}
function tabQuests(p){ensureQuests();const L=h('div',{class:'list'});for(const [i,q] of PF.quests.entries()){const pr=q.type==='value'?`${fmt(q.prog)} / ${fmt(q.n)}`:`${Math.min(q.prog,q.n)} / ${q.n}`;
  L.append(h('div',{class:'item'},h('span',{},h('span',{text:q.desc}),h('small',{text:'進度 '+pr+(q.map?' · 地圖：'+MAPS[q.map].name:'')})),h('span',{class:'price',text:'獎勵 '+fmt(q.reward)}),h('button',{type:'button',class:'ghost',text:'換一個 ($50,000)',disabled:PF.money<50000?'':null,on:{click:()=>{PF.money-=50000;PF.quests[i]=newQuest();savePF();Hub.render()}}})))}
  p.append(sec('委託任務',h('div',{},h('p',{class:'hint',text:'擊殺、爆頭、搜索類委託陣亡也會累積；撤離、價值、偵察、大紅類需要成功撤離。完成後自動領取獎勵。'}),L)));
  const bur=(PF.buried||[]);p.append(sec('埋藏的物品',bur.length?h('div',{class:'list'},...bur.map(b=>h('div',{class:'item'},h('span',{},h('span',{text:b.name}),h('small',{text:MAPS[b.map]?MAPS[b.map].name:b.map})),h('span',{class:'price',text:new Date(b.t).toLocaleDateString()})))):h('p',{class:'hint',text:'撤離時打開背包，把物品拖到「埋藏」格子就能埋在當下的位置，下次來同一張地圖再挖出來（最多 5 件）。'})))}

/* ---------- per-frame glue ---------- */
function updateWorld3(dt){updateClock(dt);updateTasks(dt);updateRemoteCars(dt);carNetTick();updateVisits();if(W.falls)for(const f of W.falls)f.material.opacity=.45+.12*Math.sin(M.t*9+f.position.x)}
