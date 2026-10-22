'use strict';
/* ================= bots ================= */
const BOTK={
  grunt:{hp:100,spd:2.5,acc:1,dmg:9,burst:[3,6],int:.11,react:[.45,.8],pref:[14,24],name:'武裝分子',armor:1,helm:1},
  heavy:{hp:220,spd:1.7,acc:1.05,dmg:11,burst:[7,12],int:.085,react:[.5,.7],pref:[16,22],name:'重裝兵',armor:4,helm:4},
  sniper:{hp:90,spd:0,acc:1.7,dmg:38,burst:[1,1],int:2,react:[.9,1.3],pref:[0,0],name:'狙擊手',armor:1,helm:2,range:150},
  boss:{hp:450,spd:2,acc:1.2,dmg:13,burst:[8,14],int:.08,react:[.35,.45],pref:[12,18],name:'指揮官 · 灰狼',armor:5,helm:4},
  soldier:{hp:100,spd:3,acc:.9,dmg:10,burst:[4,8],int:.1,react:[.35,.6],pref:[12,22],name:'士兵',armor:2,helm:2},
  zombie:{hp:120,spd:3.4,dmg:16,melee:true,name:'喪屍',armor:0,helm:0,react:[0,0],pref:[0,0],burst:[1,1],int:1},
  zbrute:{hp:520,spd:2.3,dmg:34,melee:true,name:'屍暴者',armor:0,helm:0,react:[0,0],pref:[0,0],burst:[1,1],int:1},
  gunman:{hp:100,spd:2.6,acc:1.1,dmg:40,burst:[1,1],int:.55,react:[.45,.7],pref:[10,18],name:'槍手',armor:0,helm:0},
};
const KIND_IDX=['grunt','heavy','sniper','boss','soldier','player','zombie','zbrute','gunman'];
const TEAM_COL={1:[.25,.55,1],2:[1,.23,.18]};const teamCol=t=>TEAM_COL[t]||[1,.75,.2];
const _geoCache={};
function botGeo(kind,team){const key=kind+team;if(_geoCache[key])return _geoCache[key];
  const B={p:[],n:[],uv:[],i:[],c:[]};const C=(hex)=>{const c=new T.Color(hex);return[c.r,c.g,c.b]};
  const heavy=kind==='heavy'||kind==='boss'||kind==='zbrute';const ally=team===1;
  if(kind==='zombie'||kind==='zbrute'){const sk=C(0x6f8a5a),cl=C(0x3b3a33),bl=C(0x5a1a14);const s=kind==='zbrute'?1.35:1;const bx2=(cx,cy,cz,w,h,d,col)=>pushBox(B,(cx-w/2)*s,cy*s-h*s/2,(cz-d/2)*s,(cx+w/2)*s,cy*s+h*s/2,(cz+d/2)*s,1,false,col);
    bx2(0,.98,0,.5,.22,.3,cl);bx2(0,1.3,.04,.58,.62,.36,cl);bx2(0,1.74,.08,.27,.29,.27,sk);bx2(0,1.55,.2,.3,.1,.05,bl);bx2(-.3,1.42,.3,.13,.13,.55,sk);bx2(.3,1.42,.3,.13,.13,.55,sk);bx2(.06,1.78,.14,.05,.05,.02,C(0xffee66));bx2(-.06,1.78,.14,.05,.05,.02,C(0xffee66));
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(B.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(B.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(B.c,3));g.setIndex(B.i);return _geoCache[key]=g}
  const uni=C(ally?0x3e4a52:heavy?0x2f322c:0x5b5440),vest=C(ally?0x2c363c:heavy?0x1f211c:0x3b3a2c),skin=C(0x9a7a5f),helm=C(ally?0x34404a:0x3d4033),gun=C(0x1b1b1b);
  const bx=(cx,cy,cz,w,h,d,col)=>pushBox(B,cx-w/2,cy-h/2,cz-d/2,cx+w/2,cy+h/2,cz+d/2,1,false,col);
  bx(0,.98,0,.5,.22,.3,uni);bx(0,1.3,0,.58,.62,.36,vest);bx(0,1.76,0,.26,.28,.26,skin);
  if(kind==='boss')bx(.02,1.94,0,.32,.08,.32,C(0x7a1c18));else bx(0,1.92,0,.33,.15,.33,helm);
  if(heavy)bx(0,1.78,.14,.27,.09,.04,C(0x111111));
  // arms forward holding gun
  bx(-.3,1.32,.25,.13,.13,.42,uni);bx(.3,1.3,.22,.13,.13,.38,uni);
  bx(.08,1.36,.48,.07,.11,kind==='heavy'?.95:kind==='sniper'?1.1:.75,gun);
  bx(-.37,1.5,0,.16,.07,.16,teamCol(team));bx(0,1.9,.18,.07,.045,.03,C(0xfff0c0));
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(B.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(B.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(B.c,3));g.setIndex(B.i);
  return _geoCache[key]=g}
let _legGeo=null;const legMat=new T.MeshStandardMaterial({color:0x4a4638,roughness:.95});
const markTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle='#ff4b3e';g.beginPath();g.moveTo(32,60);g.lineTo(8,20);g.lineTo(56,20);g.closePath();g.fill();g.strokeStyle='#fff';g.lineWidth=4;g.stroke();return new T.CanvasTexture(c)})();
let bots=[],botSeq=1;
function makeBot(kind,team,x,y,z,opt={}){
  if(!_legGeo)_legGeo=new T.BoxGeometry(.2,.9,.22).translate(0,-.45,0);
  const K=BOTK[kind]||BOTK.grunt;const g=new T.Group();
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.85});const up=new T.Mesh(botGeo(kind,team),mat);up.castShadow=true;g.add(up);
  const lm=team===1?new T.MeshStandardMaterial({color:0x34404a,roughness:.95}):legMat;
  const legL=new T.Mesh(_legGeo,lm);legL.position.set(-.13,.9,0);legL.castShadow=true;g.add(legL);const legR=new T.Mesh(_legGeo,lm);legR.position.set(.13,.9,0);legR.castShadow=true;g.add(legR);
  if(kind==='boss')g.scale.setScalar(1.12);
  if(M.mut&&M.mut.includes('bighead')){const hd=new T.Mesh(new T.SphereGeometry(.42,12,10),new T.MeshStandardMaterial({color:kind.startsWith('z')?0x6f8a5a:0x9a7a5f,roughness:.9}));hd.position.set(0,1.95,0);g.add(hd)}
  const mk=new T.Sprite(new T.SpriteMaterial({map:markTex,depthTest:false,transparent:true}));mk.scale.set(.5,.5,.5);mk.position.y=2.4;mk.visible=false;mk.renderOrder=10;g.add(mk);
  g.position.set(x,y,z);scene.add(g);
  const D=DIFFS[M.diff]||DIFFS.normal;
  const b={id:opt.id||botSeq++,kind,K,team,g,up,mat,legL,legR,mk,pos:g.position,yaw:SR?Math.random()*TAU:0,hp:K.hp,maxHp:K.hp,
    armor:Math.min(5,(K.armor||0)+(team===2&&M.mode==='extract'?D.tier-2:0)),helm:Math.min(5,(K.helm||0)+(team===2&&M.mode==='extract'?D.tier-2:0)),
    state:opt.hunt?'combat':'patrol',home:new T.Vector3(x,y,z),wp:null,wpT:0,idle:rnd(0,2),path:null,pi:0,pathT:0,
    tgt:null,lastSeen:new T.Vector3(x,0,z),alertT:opt.hunt?40:0,seeT:0,reaction:Math.max(.15,rnd(...K.react)+(team===2?D.react:0)),pref:rnd(...K.pref),
    cool:rnd(.3,1),burst:0,losT:Math.random()*.2,anim:0,strafe:0,strafeT:0,stuck:0,detour:0,dvx:0,dvz:0,dead:false,deathT:0,flash:0,spotT:0,firing:false,fall:pick([-1,1]),
    stunT:0,markT:0,fireSeq:0,puppet:!!opt.puppet,static:kind==='sniper',goal:null,net:{x,y,z,yaw:0},respawnT:0,lastAttacker:null,name:'',kills:0,deaths:0,dmgDealt:0,wid:opt.wid||null,gg:0,hitBy:{}};
  b.name=opt.name||botName(b.id);if(M.mode==='zombie'&&kind.startsWith('z')){b.hp=b.maxHp=K.hp*(1+(M.wave||1)*.08)}
  if(opt.hunt&&opt.huntPos)b.lastSeen.copy(opt.huntPos);
  bots.push(b);return b}
function removeBot(b){scene.remove(b.g);b.mat.dispose();bots=bots.filter(x=>x!==b)}
function clearBots(){for(const b of bots){scene.remove(b.g);b.mat.dispose()}bots=[]}

/* ---------- hit testing ---------- */
let BIGHEAD=false;
const _hb={minX:0,maxX:0,minY:0,maxY:0,minZ:0,maxZ:0};
function rayActors(o,d,maxT,skipTeam){_o[0]=o.x;_o[1]=o.y;_o[2]=o.z;_d[0]=d.x;_d[1]=d.y;_d[2]=d.z;let best=maxT,res=null;
  const test=(ent,isBot)=>{const p=ent.pos,s=ent.scale||1;
    const vx=p.x-o.x,vz=p.z-o.z,tt=vx*d.x+vz*d.z;if(tt<-1||tt>best+1)return;const px=vx-d.x*tt,pz=vz-d.z*tt;if(px*px+pz*pz>2.2)return;
    const hs=BIGHEAD?2.4:1;const parts=ent.crouch?[['head',1.18,.17*hs,.17*hs],['body',.8,.32,.38],['limb',.25,.25,.25]]:[['head',(BIGHEAD?1.95:1.76)*s,.17*s*hs,.17*s*hs],['body',1.15*s,.32*s,.5*s],['limb',.45,.25,.45]];
    for(const [nm,cy,hw,hh] of parts){_hb.minX=p.x-hw;_hb.maxX=p.x+hw;_hb.minZ=p.z-hw;_hb.maxZ=p.z+hw;_hb.minY=p.y+cy-hh;_hb.maxY=p.y+cy+hh;
      const t=slab(_hb,best);if(t>=0&&t<best){best=t;res={ent,isBot,part:nm,t}}}};
  for(const b of bots){if(b.dead||b.team===skipTeam)continue;test(b,true)}
  if(typeof netPuppets!=='undefined')for(const k in netPuppets){const p=netPuppets[k];if(!p.alive||p.team===skipTeam)continue;test(p,false)}
  return res}

/* ---------- targets ---------- */
function hostileEntities(team){const out=[];
  if(P&&P.alive&&P.team!==team&&!P.spectate)out.push({pos:P.pos,eyeH:P.eyeH(),team:P.team,local:true,crouch:P.crouch>.5,speed:P.speed,torch:P.torchOn,ref:P});
  if(typeof netPuppets!=='undefined')for(const k in netPuppets){const p=netPuppets[k];if(p.alive&&p.team!==team&&!p.downed)out.push({pos:p.pos,eyeH:p.crouch?1.05:1.62,team:p.team,remote:k,crouch:p.crouch,speed:p.speed||0,torch:p.torch,ref:p})}
  for(const b of bots)if(!b.dead&&b.team!==team&&!b.puppet)out.push({pos:b.pos,eyeH:1.65,team:b.team,bot:b,crouch:false,speed:2,ref:b});
  else if(!b.dead&&b.team!==team&&b.puppet)out.push({pos:b.pos,eyeH:1.65,team:b.team,bot:b,crouch:false,speed:2,ref:b});
  return out}
const _e1=new T.Vector3(),_e2=new T.Vector3();
function botSees(b,ent,dist,dot){
  if(M.mode!=='extract')return dist<85&&(dot>.15||dist<14);
  if(b.state==='combat')return dist<95;
  let range=ent.crouch?28:44;const tod=M.tod;
  if(tod==='night')range=ent.torch?52:(ent.crouch?11:17);else if(tod==='dusk')range*=.8;
  if(b.kind==='sniper')range=Math.max(range,tod==='night'?(ent.torch?70:25):110);
  return (dot>.42&&dist<range)||dist<7}

/* ---------- bot update ---------- */
let pathBudget=0;
function updateBot(b,dt){
  if(b.dead){if(b.deathT<1){b.deathT+=dt;const k=Math.min(1,b.deathT/.5);b.g.rotation.z=k*k*Math.PI/2*b.fall;b.mk.visible=false;if(b.deathT>=1&&b.onDeadDone){b.onDeadDone(b);b.onDeadDone=null}}return}
  if(b.flash>0){b.flash-=dt;b.mat.emissive.setRGB(1,1,1)}else b.mat.emissive.setRGB(0,0,0);
  b.markT-=dt;b.mk.visible=b.markT>0;b.spotT-=dt;
  if(b.puppet){updatePuppetBot(b,dt);return}
  const P0=b.pos;b.stunT-=dt;
  if(b.K.melee||b.wid==='knife'){updateZombie(b,dt);return}
  // perception
  b.losT-=dt;
  if(b.losT<=0){b.losT=.2+Math.random()*.08;
    const ents=hostileEntities(b.team);const fx=Math.sin(b.yaw),fz=Math.cos(b.yaw);let best=null,bd=1e9;
    const cand=[];for(const e of ents){const dx=e.pos.x-P0.x,dz=e.pos.z-P0.z,dist=Math.hypot(dx,dz);if(dist>150)continue;const dot=(dx*fx+dz*fz)/(dist||1);if(botSees(b,e,dist,dot))cand.push([dist,e])}
    cand.sort((a,c)=>a[0]-c[0]);
    for(let i=0;i<Math.min(4,cand.length);i++){const [dist,e]=cand[i];_e1.set(P0.x,P0.y+1.65,P0.z);_e2.set(e.pos.x,e.pos.y+e.eyeH,e.pos.z);if(los(_e1,_e2)){best=e;bd=dist;break}}
    b.tgt=best;b.tgtDist=bd}
  const t=b.tgt;let sees=!!t&&b.stunT<=0;
  if(sees){b.lastSeen.copy(t.pos);b.alertT=M.mode==='conquest'?4:9;if(b.state!=='combat'){b.state='combat';b.seeT=0;if(M.mode==='extract'&&t.local){blip(520,.07,'square',.025);blip(780,.07,'square',.025,0,.08)}alertAround(P0,16,t.pos)}b.seeT+=dt}
  else b.seeT=Math.max(0,b.seeT-dt*1.5);
  let mx=0,mz=0,spd=0,faceX=Math.sin(b.yaw),faceZ=Math.cos(b.yaw);
  const goTo=(x,z,speed)=>{const r=steer(b,x,z,dt);if(r===true)return true;mx=r[0];mz=r[1];spd=speed;faceX=mx;faceZ=mz;return false};
  if(b.stunT>0){mx=Math.sin(M.t*3+b.id);mz=Math.cos(M.t*2+b.id);spd=.6;b.firing=false}
  else if(b.static){if(sees){faceX=t.pos.x-P0.x;faceZ=t.pos.z-P0.z}else{faceX=Math.sin(b.yaw+.4*Math.sin(M.t*.3+b.id));faceZ=Math.cos(b.yaw+.4*Math.sin(M.t*.3+b.id))}}
  else if(b.state==='combat'){
    if(!sees){b.alertT-=dt;if(b.alertT<=0){b.state='patrol';if(M.mode==='extract')b.home.copy(P0)}
      if(goTo(b.lastSeen.x,b.lastSeen.z,b.K.spd*1.35)){b.lastSeen.x+=rnd(-7,7);b.lastSeen.z+=rnd(-7,7)}}
    else{const dx=t.pos.x-P0.x,dz=t.pos.z-P0.z,dist=b.tgtDist||Math.hypot(dx,dz);faceX=dx;faceZ=dz;
      b.strafeT-=dt;if(b.strafeT<=0){b.strafeT=rnd(.7,1.8);b.strafe=pick([-1,1,0,0])}
      const ux=dx/dist,uz=dz/dist,fw=dist>b.pref+5?1:dist<b.pref-6?-.8:0;
      mx=ux*fw-uz*b.strafe;mz=uz*fw+ux*b.strafe;const ml=Math.hypot(mx,mz);if(ml>0){mx/=ml;mz/=ml;spd=b.K.spd*(b.firing?.55:1)}}
  }else if(M.mode!=='extract'&&b.goal){if(goTo(b.goal.x+b.goalOff.x,b.goal.z+b.goalOff.z,b.K.spd)){b.goalOff.set(rnd(-6,6),0,rnd(-6,6))}}
  else{ // patrol
    if(!b.wp||b.wpT<=0){let p=null;for(let k=0;k<6&&!p;k++){const x=b.home.x+rnd(-14,14),z=b.home.z+rnd(-14,14);if(isFree(x,z,.6))p={x,z}}b.wp=p||{x:b.home.x,z:b.home.z};b.wpT=rnd(7,13);b.idle=rnd(1,3.5)}
    b.wpT-=dt;if(b.idle>0)b.idle-=dt;else if(goTo(b.wp.x,b.wp.z,1.45))b.wpT=0}
  // fire
  if(sees&&b.seeT>b.reaction&&b.stunT<=0){b.cool-=dt;if(b.cool<=0){if(b.burst>0){botShoot(b,t,b.tgtDist);b.burst--;b.cool=b.K.int;b.firing=true}else{b.burst=Math.round(rnd(...b.K.burst));b.cool=rnd(.45,1.15)*(b.kind==='sniper'?2:1);b.firing=false}}}
  // doors: open closed unlocked doors nearby when moving
  if(spd>0&&W.doors.length&&(b.id+(M.frame|0))%10===0){for(const d of W.doors){if(!d.open&&!d.locked&&Math.abs(d.x-P0.x)<1.8&&Math.abs(d.z-P0.z)<1.8&&Math.abs(d.y-P0.y)<1)toggleDoor(d,true)}}
  if(b.detour>0){b.detour-=dt;mx=b.dvx;mz=b.dvz;spd=Math.max(spd,2)}
  if(spd>0){const ox=P0.x,oz=P0.z;moveCircle(P0,mx*spd*dt,mz*spd*dt,.36,P0.y,P0.y+1.8);if(W.clampExtra)W.clampExtra(P0);const moved=Math.hypot(P0.x-ox,P0.z-oz);
    b.stuck=moved<spd*dt*.3?b.stuck+dt:Math.max(0,b.stuck-dt);if(b.stuck>.4&&b.detour<=0){const s=pick([-1,1]);b.dvx=-mz*s;b.dvz=mx*s;b.detour=rnd(.5,1.1);b.stuck=0;b.pathT=0}
    b.anim+=dt*spd*3.3}
  // gravity / ground
  const gnd=groundAt(P0.x,P0.z,.3,P0.y);if(P0.y>gnd+.05){b.vy=(b.vy||0)-GRAV*dt;P0.y=Math.max(gnd,P0.y+b.vy*dt)}else{P0.y=gnd;b.vy=0}
  const want=Math.atan2(faceX,faceZ);b.yaw+=angDiff(want,b.yaw)*Math.min(1,dt*(b.state==='combat'?10:4));b.g.rotation.y=b.yaw;
  const sw=spd>0?Math.sin(b.anim)*.6:0;b.legL.rotation.x=sw;b.legR.rotation.x=-sw;
}
function steer(b,x,z,dt){const P0=b.pos;const dxx=x-P0.x,dzz=z-P0.z,dd=Math.hypot(dxx,dzz);if(dd<1.2)return true;
  b.pathT-=dt;
  if((!b.path||b.pathT<=0||(b.pathGoal&&Math.hypot(b.pathGoal.x-x,b.pathGoal.z-z)>6))&&pathBudget>0&&P0.y<.6){pathBudget--;b.path=findPath(P0.x,P0.z,x,z);b.pi=1;b.pathT=rnd(2.5,4);b.pathGoal={x,z}}
  let tx=x,tz=z;if(b.path&&b.pi<b.path.length){const n=b.path[b.pi];tx=n.x;tz=n.z;if(Math.hypot(tx-P0.x,tz-P0.z)<1.1)b.pi++}
  const ax=tx-P0.x,az=tz-P0.z,al=Math.hypot(ax,az)||1;return[ax/al,az/al]}
function updateZombie(b,dt){const P0=b.pos;
  b.losT-=dt;if(b.losT<=0||!b.tgt){b.losT=.5+Math.random()*.3;let best=null,bd=1e9;for(const e of hostileEntities(b.team)){const d=e.pos.distanceTo(P0);if(d<bd){bd=d;best=e}}b.tgt=best;b.tgtDist=bd}
  const t=b.tgt;let mx=0,mz=0,spd=0,fx=Math.sin(b.yaw),fz=Math.cos(b.yaw);
  if(t&&b.stunT<=0){const d=Math.hypot(t.pos.x-P0.x,t.pos.z-P0.z);b.tgtDist=d;
    if(d<1.7&&Math.abs(t.pos.y-P0.y)<1.6){b.cool-=dt;fx=t.pos.x-P0.x;fz=t.pos.z-P0.z;if(b.cool<=0){b.cool=.9;b.anim+=2;const dmg=b.wid==='knife'?999:b.K.dmg*DIFFS[M.diff].dmg*(MUT('hardcore')?3:1);
      if(t.local)damagePlayer(dmg,P0,{melee:true,bot:b,explosion:b.wid==='knife'});else if(t.remote!==undefined){if(typeof netDamageRemote==='function')netDamageRemote(t.remote,dmg,P0,false,'b'+b.id)}else if(t.bot&&!t.bot.puppet)damageBot(t.bot,dmg,'body',{bot:b},null);
      noiseHit(.15,400,.25*clamp(1-camera.position.distanceTo(P0)/30,0,1),panTo(P0.x,P0.z));b.fireSeq++}}
    else{const r=d<14&&Math.abs(t.pos.y-P0.y)<1?[(t.pos.x-P0.x)/d,(t.pos.z-P0.z)/d]:steer(b,t.pos.x,t.pos.z,dt);if(r!==true){mx=r[0];mz=r[1];spd=b.K.spd*(1+(M.wave||1)*.03);fx=mx;fz=mz}}}
  else if(b.stunT>0){mx=Math.sin(M.t*3+b.id);mz=Math.cos(M.t*2+b.id);spd=.5}
  if(Math.random()<dt*.15&&camera.position.distanceTo(P0)<30)blip(rnd(70,110),.5,'sawtooth',.03*clamp(1-camera.position.distanceTo(P0)/30,0,1),-30);
  if(b.detour>0){b.detour-=dt;mx=b.dvx;mz=b.dvz;spd=Math.max(spd,2)}
  if(spd>0){const ox=P0.x,oz=P0.z;moveCircle(P0,mx*spd*dt,mz*spd*dt,.36,P0.y,P0.y+1.8);if(W.clampExtra)W.clampExtra(P0);const moved=Math.hypot(P0.x-ox,P0.z-oz);
    b.stuck=moved<spd*dt*.3?b.stuck+dt:Math.max(0,b.stuck-dt);if(b.stuck>.4&&b.detour<=0){const s=pick([-1,1]);b.dvx=-mz*s;b.dvz=mx*s;b.detour=rnd(.5,1.1);b.stuck=0;b.pathT=0}b.anim+=dt*spd*3.3}
  const gnd=groundAt(P0.x,P0.z,.3,P0.y);if(P0.y>gnd+.05){b.vy=(b.vy||0)-GRAV*dt;P0.y=Math.max(gnd,P0.y+b.vy*dt)}else{P0.y=gnd;b.vy=0}
  b.yaw+=angDiff(Math.atan2(fx,fz),b.yaw)*Math.min(1,dt*8);b.g.rotation.y=b.yaw;const sw=spd>0?Math.sin(b.anim)*.7:0;b.legL.rotation.x=sw;b.legR.rotation.x=-sw}
const MUT=k=>M.mut&&M.mut.includes(k);
function alertAround(pos,r,tpos){for(const o of bots){if(o.dead||o.puppet||o.team!==2||M.mode!=='extract')continue;if(o.pos.distanceTo(pos)<r){if(o.state!=='combat'){o.state='combat';o.seeT=0}o.lastSeen.copy(tpos);o.alertT=Math.max(o.alertT,8)}}}
function alertNoise(pos,r,src){if(M.mode!=='extract')return;for(const o of bots){if(o.dead||o.puppet||o.team===1)continue;if(o.pos.distanceTo(pos)<r){if(o.state!=='combat'){o.state='combat';o.seeT=0}o.lastSeen.copy(src||pos);o.alertT=Math.max(o.alertT,8)}}}
const _m1=new T.Vector3(),_m2=new T.Vector3();
function botMuzzle(b,out){return b.g.localToWorld(out.set(.08,1.36,b.kind==='heavy'?1:.88))}
function botShoot(b,t,dist){
  const D=DIFFS[M.diff];const isPve=M.mode==='extract'&&b.team===2;
  const muz=botMuzzle(b,_m1).clone();
  let acc=clamp(.62-dist*.0085,.06,.62)*b.K.acc;if(b.kind==='sniper')acc=clamp(.75-dist*.003,.3,.75);
  if(t.speed>4.8)acc*=.55;else if(t.speed>.6)acc*=.78;if(t.crouch)acc*=.8;
  acc*=clamp(.55+b.seeT*.25,.55,1);if(isPve||(M.mode==='conquest'&&b.team===2&&(t.local||t.remote)))acc*=D.acc;
  if(M.mode==='conquest'&&t.bot)acc*=.75;
  const aim=_m2.set(t.pos.x,t.pos.y+t.eyeH-.35,t.pos.z);
  if(M.mode==='oitc')acc*=.42;if(M.mode==='duel')acc*=.7;if(M.mode==='gungame')acc*=.8;
  const hit=Math.random()<acc;let end;
  let dmg=b.K.dmg*(isPve||(M.mode!=='extract'&&(t.local||t.remote))?D.dmg:1)*rnd(.85,1.15);
  if(b.wid&&WEAPONS[b.wid]){const w=WEAPONS[b.wid];dmg=w.dmg*(w.pel?w.pel*.5:1)*.5*(t.local||t.remote?D.dmg:1)}
  if(M.mode==='oitc')dmg=999;
  if(MUT('hardcore'))dmg*=3;
  let hitNow=hit;const headRoll=Math.random()<(b.kind==='sniper'?.35:.12);if(MUT('headonly')&&!headRoll)hitNow=false;
  if(hitNow){end=aim.clone();const head=headRoll;
    if(t.local)damagePlayer(dmg,b.pos,{bot:b,head});
    else if(t.remote!==undefined){if(typeof netDamageRemote==='function')netDamageRemote(t.remote,dmg,b.pos,head,'b'+b.id)}
    else if(t.bot&&!t.bot.puppet)damageBot(t.bot,dmg,head?'head':'body',{bot:b},null)}
  else if(hit){end=aim.clone()}
  else{const dir=aim.clone().sub(muz).normalize();const side=new T.Vector3(-dir.z,0,dir.x).normalize();const off=side.multiplyScalar(rnd(-1.6,1.6)).add(new T.Vector3(0,rnd(-.6,1.2),0));
    const tgt=aim.clone().add(off);const d2=tgt.clone().sub(muz).normalize();
    if(rayWorld(muz,d2,dist+60)){end=muz.clone().addScaledVector(d2,RH.t);if(RH.t<dist+8){emit(end,4,'spark',4,.2,.03,6,{x:RH.nx,y:RH.ny,z:RH.nz},.8);decal(end,RH.nx,RH.ny,RH.nz)}if(RH.box&&RH.box.barrel)hitBarrel(RH.box,8);if(RH.box&&RH.box.shield)RH.box.shield.hp-=dmg}
    else end=muz.clone().addScaledVector(d2,dist+60);
    if(t.local&&dist<60&&off.length()<1.9){whiz(panTo(b.pos.x,b.pos.z));P.shake=Math.max(P.shake,.22)}}
  shotFX(b,muz,end,dist);
}
function shotFX(b,muz,end,distToCam){tracer(muz,end,b.team===1?0x9ad0ff:0xffb070,.03);worldFlash(muz);
  const dc=camera.position.distanceTo(b.pos);const vol=clamp(1-dc/140,.04,1)*.42;gunSnd(vol,dc>40?600:900,.22,dc<30?100:0,panTo(b.pos.x,b.pos.z));b.spotT=1.6;b.fireSeq++}
function panTo(x,z){const dx=x-camera.position.x,dz=z-camera.position.z;const b=Math.atan2(dx,-dz);return Math.sin(b-(-P.yaw))}
function damageBot(b,dmg,part,src,dir){
  if(b.dead)return;
  if(MUT('headonly')&&part!=='head'&&!(src&&(src.how||src.env)))return;
  if(MUT('hardcore'))dmg*=3;
  if(M.mode==='oitc'&&src&&(src.player||src.remote||src.bot))dmg=999;
  if(M.mode==='zombie'&&part==='head'&&src&&src.player&&src.wid&&WEAPONS[src.wid]&&WEAPONS[src.wid].slot==='pistol')dmg*=1.5;
  if(b.puppet){if(typeof netReportHit==='function')netReportHit(b.id,dmg,part);b.flash=.07;return}
  if(src&&src.player)b.hitBy.me=M.t;
  if(part==='head'){dmg*=1-TIER_PROT[b.helm]*.6}else if(part==='body'){dmg*=1-TIER_PROT[b.armor]*.7}
  if(b.kind==='boss'&&part!=='head')dmg*=.85;
  b.hp-=dmg;b.flash=.07;b.lastAttacker=src;if(src&&src.bot)src.bot.dmgDealt+=dmg;
  if(b.team!==1||M.mode==='conquest'){if(b.state!=='combat'){b.state='combat';b.seeT=0}b.seeT=Math.max(b.seeT,b.reaction*.6);b.cool+=.12;b.alertT=12;
    if(src&&src.pos)b.lastSeen.copy(src.pos);else if(src&&src.bot)b.lastSeen.copy(src.bot.pos)}
  if(b.hp<=0)killBot(b,src,part);
}
function killBot(b,src,part){if(b.dead)return;b.dead=true;b.deathT=0;b.hp=0;onBotKilled(b,src,part)}

/* ---------- turrets / cameras / mines / barrels ---------- */
function updateWorldMech(dt){if(!W)return;
  for(const e of W.elevators){if(e.wait>0)e.wait-=dt;else{e.y+=e.dir*2.6*dt;if(e.y>=e.y1){e.y=e.y1;e.dir=-1;e.wait=3}else if(e.y<=e.y0){e.y=e.y0;e.dir=1;e.wait=3}}e.b.minY=e.y;e.b.maxY=e.y+.3;e.m.position.y=e.y+.15}
  for(const pd of W.pads)pd.ring.material.opacity=.35+.3*Math.sin(M.t*6);
  for(const g of W.gas){if(Math.random()<dt*5)puff({x:g.x+rnd(-g.r*.7,g.r*.7),y:.2,z:g.z+rnd(-g.r*.7,g.r*.7)},1,4,4,0x9ad06a,.45,.5,.4);
    if(P&&P.alive&&Math.hypot(P.pos.x-g.x,P.pos.z-g.z)<g.r&&P.pos.y<3){P.gasT=(P.gasT||0)+dt;if(P.gasT>.5){P.gasT=0;damagePlayer(6,null,{gas:true});note('毒氣區！快離開')}}
    for(const b of bots)if(!b.dead&&!b.puppet&&Math.hypot(b.pos.x-g.x,b.pos.z-g.z)<g.r&&Math.random()<dt*2)damageBot(b,6,'body',{env:true},null)}
  for(const a of W.ammoSt)if(a.cd>0){a.cd-=dt;if(a.cd<=0&&a.strip>=0){_tc.setHex(0x5ff0ff);W.stripMesh.setColorAt(a.strip,_tc);W.stripMesh.instanceColor.needsUpdate=true}}
  for(const c of W.cameras)if(c.search&&c.cone)c.cone.visible=!c.dead&&M.tod!=='day'}
function updateDevices(dt){
  updateWorldMech(dt);
  if(M.mode!=='extract'||!P)return;const pe=_e2.set(P.pos.x,P.pos.y+P.eyeH(),P.pos.z);
  for(const t of W.turrets){if(t.dead)continue;const hp=_e1.set(t.x,t.y+1.1,t.z);const dist=hp.distanceTo(pe);
    let sees=false;if(P.alive&&dist<45&&!P.spectate){t.losT=(t.losT||0)-dt;if(t.losT<=0){t.losT=.25;t.los=los(hp,pe)}sees=t.los}
    if(sees){t.see+=dt;const want=Math.atan2(pe.x-t.x,pe.z-t.z);t.yaw+=angDiff(want,t.yaw)*Math.min(1,dt*5);
      if(t.see>.7){t.cool-=dt;if(t.cool<=0){if(t.burst>0){t.burst--;t.cool=.12;const muz=hp.clone().add(new T.Vector3(Math.sin(t.yaw)*.9,0,Math.cos(t.yaw)*.9));
        const hit=Math.random()<clamp(.5-dist*.006,.12,.5)*(P.speed>4?.6:1)*DIFFS[M.diff].acc;const end=pe.clone();if(!hit)end.add(new T.Vector3(rnd(-1.5,1.5),rnd(-.5,1),rnd(-1.5,1.5)));else damagePlayer(7*DIFFS[M.diff].dmg,new T.Vector3(t.x,0,t.z),{});
        tracer(muz,end,0xff8060,.03);worldFlash(muz);gunSnd(.3*clamp(1-dist/80,.1,1),1200,.15,0,panTo(t.x,t.z));if(!hit&&dist<40)whiz(panTo(t.x,t.z))}else{t.burst=6;t.cool=.9}}}}
    else{t.see=Math.max(0,t.see-dt);t.yaw+=dt*.5}
    t.head.rotation.y=t.yaw}
  for(const c of W.cameras){if(c.dead)continue;c.t+=dt;c.yaw=c.base+Math.sin(c.t*(c.search?.3:.5))*(c.search?1.2:.9);c.g.rotation.y=c.yaw;
    if(c.search&&M.tod==='day')continue;
    const dx=pe.x-c.x,dz=pe.z-c.z,dist=Math.hypot(dx,dz);let seeing=false;const rng=c.search?60:32;
    if(P.alive&&!P.spectate&&dist<rng){const dot=(dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw))/dist;if(dot>(c.search?.94:.75)){c.losT=(c.losT||0)-dt;if(c.losT<=0){c.losT=.25;c.los=los(_e1.set(c.x,c.y,c.z),pe)}seeing=c.los}}
    if(seeing){c.see+=dt;c.lens.material.color.setHex(Math.sin(M.t*20)>0?0xffffff:0xff2a2a);if(c.see>.9&&!M.alarmT)triggerAlarm(c)}else{c.see=Math.max(0,c.see-dt*.5);c.lens.material.color.setHex(0xff2a2a)}}
  for(const m of W.mines){if(!m.armed)continue;if(m.fuse>0){m.fuse-=dt;if(m.fuse<=0){m.armed=false;scene.remove(m.m);scene.remove(m.p1);scene.remove(m.p2);explode(new T.Vector3((m.ax+m.bx)/2,.4,(m.az+m.bz)/2),6,180,{mine:true})}continue}
    if(!P.alive||P.pos.y>.8)continue;const ax=m.ax,az=m.az,bx=m.bx-ax,bz=m.bz-az,L2=bx*bx+bz*bz;let tt=((P.pos.x-ax)*bx+(P.pos.z-az)*bz)/L2;tt=clamp(tt,0,1);
    if(Math.hypot(ax+bx*tt-P.pos.x,az+bz*tt-P.pos.z)<.35){m.fuse=.35;blip(1800,.08,'square',.08);blip(1800,.08,'square',.08,0,.15)}}
}
function triggerAlarm(c){M.alarmT=30;banner('警報響起','附近敵人正在趕來，增援即將抵達',2.5);for(let i=0;i<3;i++)blip(900,.25,'sawtooth',.08,-400,i*.35);
  alertNoise(new T.Vector3(c.x,0,c.z),90,P.pos.clone());if(M.isHost||!M.net)spawnSquad(3,P.pos,40,60);else netSend({t:'alarm',x:P.pos.x,z:P.pos.z})}
function hitBarrel(box,dmg){const br=box.barrel;if(!br||br.dead)return;br.hp-=dmg;if(br.hp<=0&&!br.fuse)br.fuse=.08}
function updateBarrels(dt){for(const b of W.boxes){if(!b.barrel||b.barrel.dead||!b.barrel.fuse)continue;b.barrel.fuse-=dt;if(b.barrel.fuse<=0){b.barrel.dead=true;b.off=true;b.mesh.visible=false;explode(b.barrel.pos,7.5,230,{barrel:true})}}}
function explode(pos,R,maxDmg,src={}){
  fireball(pos,R*.55);emit(pos,40,'fire',12,.6,.12,4);emit(pos,24,'spark',18,.8,.05,9.8);emit(pos,20,'dust',8,1.4,.15,5);puff(pos,10,5,3.2,0x4a443c);
  lightFlash(_e1.copy(pos).setY(pos.y+1),9,34);
  const from=_e1.copy(pos);from.y+=.4;const fromC=from.clone();
  for(const b of bots){if(b.dead||(src.team&&b.team===src.team&&M.mode!=='extract'&&!M.ff))continue;const c=_e2.set(b.pos.x,b.pos.y+1.2,b.pos.z);const d=c.distanceTo(pos);if(d<R&&los(fromC,c))damageBot(b,maxDmg*Math.pow(1-d/R,.8),'body',src.player?{player:true,pos:P.pos,how:'爆炸'}:{env:true},null)}
  if(P&&P.alive){const pe=new T.Vector3(P.pos.x,P.pos.y+P.eyeH(),P.pos.z);const dp=pe.distanceTo(pos);if(dp<R&&los(fromC,pe)&&!(src.player&&M.mode==='conquest'&&src.selfSafe))damagePlayer(maxDmg*.55*Math.pow(1-dp/R,.8),pos,{explosion:true});
    P.shake=Math.max(P.shake,clamp(2.4-dp/14,.3,2.4));boomSnd(clamp(1-dp/150,.2,1),panTo(pos.x,pos.z))}
  for(const b of W.boxes){if(b.barrel&&!b.barrel.dead&&!b.barrel.fuse&&b.barrel.pos.distanceTo(pos)<R*.8)b.barrel.fuse=rnd(.15,.3)}
  for(const t of W.turrets)if(!t.dead&&Math.hypot(t.x-pos.x,t.z-pos.z)<R)damageDevice(t.box,maxDmg*.6);
  for(const b of W.breakables)if(!b.off&&Math.hypot(b.board.x-pos.x,b.board.z-pos.z)<R)breakBoard(b);
  for(const s of W.shields)if(s.hp>0&&Math.hypot(s.x-pos.x,s.z-pos.z)<R)s.hp-=maxDmg*.5;
  alertNoise(pos,60,P?P.pos:pos);
}
function damageDevice(box,dmg){if(box.turret){const t=box.turret;if(t.dead)return;t.hp-=dmg;if(t.hp<=0){t.dead=true;box.off=true;t.g.visible=false;explode(new T.Vector3(t.x,t.y+.8,t.z),4,60,{});feedMsg('摧毀 <b>自動砲塔</b>')}else hitmark('body')}
  if(box.cam){const c=box.cam;if(c.dead)return;c.hp-=dmg;if(c.hp<=0){c.dead=true;box.off=true;c.g.visible=false;emit(new T.Vector3(c.x,c.y,c.z),12,'spark',5,.5,.04,8);hitmark('kill')}}
  if(box.shield){box.shield.hp-=dmg}
  if(box.board){box.board.hp-=dmg;if(box.board.hp<=0)breakBoard(box)}}
function spawnSquad(n,center,rMin,rMax,kindOverride){let k=0;for(let i=0;i<n;i++){for(let j=0;j<30;j++){const a=Math.random()*TAU,r=rnd(rMin,rMax),x=center.x+Math.cos(a)*r,z=center.z+Math.sin(a)*r;
  if(isFree(x,z,.7)){makeBot(kindOverride||(Math.random()<DIFFS[M.diff].heavy+.1?'heavy':'grunt'),2,x,0,z,{hunt:true,huntPos:P?P.pos:center});k++;break}}}return k}
function updatePuppetBot(b,dt){const n=b.net;const k=Math.min(1,dt*10);b.pos.x=lerp(b.pos.x,n.x,k);b.pos.y=lerp(b.pos.y,n.y,k);b.pos.z=lerp(b.pos.z,n.z,k);b.yaw+=angDiff(n.yaw,b.yaw)*k;b.g.rotation.y=b.yaw;
  const sp=n.spd||0;b.anim+=dt*sp*3.3;const sw=sp>.3?Math.sin(b.anim)*.6:0;b.legL.rotation.x=sw;b.legR.rotation.x=-sw}
