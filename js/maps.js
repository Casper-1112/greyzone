'use strict';
/* ================= world creation ================= */
function newWorld(mapId,seed,mode){
  if(W)disposeWorld();
  SR=mulberry(seed);buildMaterials(mapId);
  W={id:mapId,mode,half:MAPS[mapId].half,boxes:[],meshes:[],containers:[],doors:[],cameras:[],turrets:[],mines:[],switches:[],ladders:[],extracts:[],flags:[],
    roofSpots:[],spawnsP:[],enemySpots:[],bossSpot:null,bases:{1:null,2:null},smokes:[],shields:[],lampPos:[],glows:[],power:false,clampExtra:null,bodies:[],nav:null,stripCount:0};
  gridInit(W.half);
  const h=W.half;
  // ground
  const gt=MAT.ground.map;gt.repeat.set(h/3.5,h/3.5);
  const g=new T.Mesh(new T.PlaneGeometry(h*2+260,h*2+260),MAT.ground);g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);W.meshes.push(g);
  // mountains ring
  for(let i=0;i<18;i++){const a=i/18*TAU+srnd(-.1,.1),R=h+srnd(70,120),hh=srnd(40,90);const m=new T.Mesh(new T.ConeGeometry(srnd(45,85),hh,6),MAT.mtn);m.position.set(Math.cos(a)*R,hh/2-3,Math.sin(a)*R);scene.add(m);W.meshes.push(m)}
  // perimeter
  const wm=mapId==='frost'?'rock':'dark';
  for(const s of [-1,1]){sbox(0,s*h,h*2+2,1.4,6,wm,0,{uv:3});sbox(s*h,0,1.4,h*2,6,wm,0,{uv:3})}
  // strips instanced (loot crate lights)
  W.stripMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xffffff}),260);for(let i=0;i<260;i++){W.stripMesh.setColorAt(i,new T.Color(0xffffff));_m4.makeScale(0,0,0);W.stripMesh.setMatrixAt(i,_m4)}W.stripMesh.count=0;scene.add(W.stripMesh);W.meshes.push(W.stripMesh);
  ({town:genTown,harbor:genHarbor,frost:genFrost})[mapId]();
  bucketsToMeshes();
  buildNav();
  W.stripMesh.instanceMatrix.needsUpdate=true;if(W.stripMesh.instanceColor)W.stripMesh.instanceColor.needsUpdate=true;
  buildMinimapBase();
}
function disposeWorld(){
  for(const m of W.meshes){scene.remove(m);if(m.geometry)m.geometry.dispose();if(m.isInstancedMesh&&m.material)m.material.dispose()}
  for(const o of W.dynObjs||[])scene.remove(o);
  W=null}
function addObj(o){scene.add(o);(W.dynObjs||(W.dynObjs=[])).push(o);return o}

/* ---------- building blocks ---------- */
function road(x,z,w,d){const m=new T.Mesh(new T.PlaneGeometry(w,d),MAT.road);m.rotation.x=-Math.PI/2;m.position.set(x,.015,z);m.receiveShadow=true;
  MAT.road.polygonOffset=true;MAT.road.polygonOffsetFactor=-2;const t=MAT.road.map;t.repeat.set(1,1);
  // stretch UVs to avoid huge tiles
  const uv=m.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/6,uv.getY(i)*d/6);uv.needsUpdate=true;
  scene.add(m);W.meshes.push(m)}
function wallRun(axis,fixed,a,b,y0,h,mat,ops,t=.36){
  ops.sort((p,q)=>p.c-q.c);let cur=a;
  const seg=(s,e,ya,yb)=>{if(e-s<.05||yb-ya<.05)return;const mid=(s+e)/2,L=e-s;axis==='x'?sbox(mid,fixed,L,t,yb-ya,mat,y0+ya):sbox(fixed,mid,t,L,yb-ya,mat,y0+ya)};
  for(const o of ops){const s=o.c-o.w/2,e=o.c+o.w/2;seg(cur,s,0,h);if(o.b>0)seg(s,e,0,o.b);seg(s,e,o.t,h);cur=e}
  seg(cur,b,0,h)}
function makeDoor(x,z,axis,w,y0=0,locked=null){
  // axis: wall direction ('x' wall spans x). door panel lies in the wall line.
  const th=.1,h=2.5;const pivot=new T.Group();pivot.position.set(axis==='x'?x-w/2:x,y0,axis==='x'?z:z-w/2);
  const panel=new T.Mesh(new T.BoxGeometry(axis==='x'?w:th,h,axis==='x'?th:w),locked?MAT.metal:MAT.wood);panel.castShadow=true;panel.receiveShadow=true;
  panel.position.set(axis==='x'?w/2:0,h/2,axis==='x'?0:w/2);pivot.add(panel);addObj(pivot);
  if(locked){const lm=new T.Mesh(new T.BoxGeometry(.18,.25,.05),new T.MeshBasicMaterial({color:locked==='R'?0xff3b2f:0x3b8bff}));lm.position.set(axis==='x'?w*.85:.08,1.3,axis==='x'?.08:w*.85);pivot.add(lm);
    const lm2=lm.clone();lm2.position.set(axis==='x'?w*.85:-.08,1.3,axis==='x'?-.08:w*.85);pivot.add(lm2)}
  const b={minX:axis==='x'?x-w/2:x-th/2,maxX:axis==='x'?x+w/2:x+th/2,minZ:axis==='x'?z-th/2:z-w/2,maxZ:axis==='x'?z+th/2:z+w/2,minY:y0,maxY:y0+h,solid:true,shoot:true,kind:'door'};
  W.boxes.push(b);gridAdd(b);
  const d={x,z,y:y0,axis,w,pivot,box:b,open:false,locked,anim:0,target:0};b.door=d;W.doors.push(d);return d}
function toggleDoor(d,byBot=false){if(d.locked)return false;d.open=!d.open;d.target=d.open?1:0;d.box.off=d.open;if(!byBot)blip(d.open?300:240,.08,'triangle',.05);return true}
function stripAt(x,y,z,w,col){if(W.stripCount>=260)return -1;const i=W.stripCount++;_m4.makeScale(w,.05,.02);_m4.setPosition(x,y,z);W.stripMesh.setMatrixAt(i,_m4);_tc.setHex(col);W.stripMesh.setColorAt(i,_tc);W.stripMesh.count=W.stripCount;return i}
const STRIP_COL={crate:0xffb547,weapon:0x9ad06a,med:0x72f5a8,safe:0xff8a3a,vault:0xfff0a0,pc:0x6db5ff,airdrop:0xff4b3e};
function lootBox(x,z,type='crate',y0=0){
  const S={crate:[1.05,.62,.66,'loot',1.3],weapon:[1.4,.5,.6,'cG',1.6],med:[.8,.5,.5,'wallA',1],safe:[.8,1,.7,'metal',3],vault:[1.3,.78,.82,'gold',2.6],pc:[.6,.5,.5,'dark',1.4],airdrop:[1.6,1.2,1.6,'cR',3]}[type];
  if(!isFree(x,z,Math.max(S[0],S[2])/2+.15,y0)&&type!=='airdrop')return null;
  const b=sbox(x,z,S[0],S[2],S[1],S[3],y0,{uv:1});
  const si=stripAt(x,y0+S[1]*.7,z+S[2]/2+.012,S[0]*.72,STRIP_COL[type]);
  const c={type,x,z,y:y0+S[1]/2,pos:new T.Vector3(x,y0+S[1]/2,z),time:S[4],searched:false,items:null,strip:si,box:b,left:0};W.containers.push(c);return c}
function setStrip(c,col){if(c.strip<0)return;_tc.setHex(col);W.stripMesh.setColorAt(c.strip,_tc);W.stripMesh.instanceColor.needsUpdate=true}
function woodCrate(x,z,y0=0,s=1.2){sbox(x,z,s,s,s,'wood',y0,{uv:s})}
function sandbag(x,z,len,rot){rot?sbox(x,z,.8,len,1.05,'sand',0,{uv:1}):sbox(x,z,len,.8,1.05,'sand',0,{uv:1})}
const barrelGeo=new T.CylinderGeometry(.42,.42,1.15,14);
function barrel(x,z,explosive){if(!isFree(x,z,.5))return;const m=new T.Mesh(barrelGeo,explosive?MAT.barrel:MAT.drum);m.position.set(x,.575,z);m.castShadow=m.receiveShadow=true;scene.add(m);W.meshes.push(m);
  const b={minX:x-.42,maxX:x+.42,minZ:z-.42,maxZ:z+.42,minY:0,maxY:1.15,solid:true,shoot:true,kind:'barrel',mesh:m};W.boxes.push(b);gridAdd(b);
  if(explosive){b.barrel={hp:25,pos:new T.Vector3(x,.6,z),dead:false,fuse:0}}}
function container(x,z,rot,y0=0,mat){const L=6.1,Wd=2.44,H=2.6;mat=mat||spick(['cR','cB','cG','cT','cW']);rot?sbox(x,z,Wd,L,H,mat,y0,{uv:2.6}):sbox(x,z,L,Wd,H,mat,y0,{uv:2.6})}
function stairs(x,z,dir,width,height,mat='dark'){ // dir: 'x+','x-','z+','z-' direction of ascent; starts at x,z
  const n=Math.ceil(height/.34),rise=height/n,run=.42;
  for(let i=0;i<n;i++){const top=(i+1)*rise;const o=(i+.5)*run;
    if(dir==='x+')sbox(x+o,z,run,width,top,mat,0,{uv:1});else if(dir==='x-')sbox(x-o,z,run,width,top,mat,0,{uv:1});
    else if(dir==='z+')sbox(x,z+o,width,run,top,mat,0,{uv:1});else sbox(x,z-o,width,run,top,mat,0,{uv:1})}
  return n*run}
function ladder(x,z,face,top){ // face: normal direction of wall the ladder is on ('x+','x-','z+','z-')
  const off=.25,ax=face[0],sg=face[1]==='+'?1:-1;const lx=ax==='x'?x+sg*off:x,lz=ax==='z'?z+sg*off:z;
  const rail=(dx,dz)=>sbox(lx+dx,lz+dz,.06,.06,top,'metal',0,{solid:false,shoot:false});
  if(ax==='x'){rail(0,-.25);rail(0,.25);for(let y=.4;y<top;y+=.4)sbox(lx,lz,.05,.5,.04,'metal',y,{solid:false,shoot:false})}
  else{rail(-.25,0);rail(.25,0);for(let y=.4;y<top;y+=.4)sbox(lx,lz,.5,.05,.04,'metal',y,{solid:false,shoot:false})}
  W.ladders.push({minX:lx-.6,maxX:lx+.6,minZ:lz-.6,maxZ:lz+.6,top:top+.35,face})}
function lamp(x,z){if(!isFree(x,z,.3))return;sbox(x,z,.18,.18,5.4,'dark',0,{uv:1});W.lampPos.push(new T.Vector3(x-.35,5.2,z-.35));
  const b=new T.Mesh(new T.BoxGeometry(.5,.12,.3),W.bulbMat||(W.bulbMat=new T.MeshBasicMaterial({color:0x6b6458})));b.position.set(x-.35,5.35,z-.35);scene.add(b);W.meshes.push(b);
  const gs=new T.Sprite(new T.SpriteMaterial({map:softTex,color:0xffb868,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.85}));gs.position.set(x-.35,5.2,z-.35);gs.scale.set(3,3,3);gs.visible=false;addObj(gs);W.glows.push(gs)}
function camDevice(x,y,z,yaw){const g=new T.Group();g.position.set(x,y,z);const body=new T.Mesh(new T.BoxGeometry(.22,.18,.42),MAT.metal);body.position.z=.15;g.add(body);
  const lens=new T.Mesh(new T.CircleGeometry(.07,10),new T.MeshBasicMaterial({color:0xff2a2a}));lens.position.z=.365;g.add(lens);addObj(g);
  const c={g,lens,x,y,z,base:yaw,yaw,hp:15,dead:false,see:0,t:SR()*10};g.rotation.y=yaw;W.cameras.push(c);
  const b={minX:x-.2,maxX:x+.2,minZ:z-.2,maxZ:z+.2,minY:y-.15,maxY:y+.15,solid:false,shoot:true,kind:'cam',cam:c};W.boxes.push(b);gridAdd(b);c.box=b;return c}
function turret(x,z,y0=0){const g=new T.Group();g.position.set(x,y0,z);const base=new T.Mesh(new T.BoxGeometry(.9,.9,.9),MAT.metal);base.position.y=.45;base.castShadow=true;g.add(base);
  const head=new T.Group();head.position.y=1.1;g.add(head);const hb=new T.Mesh(new T.BoxGeometry(.6,.4,.6),MAT.dark);head.add(hb);
  const br=new T.Mesh(new T.BoxGeometry(.1,.1,.9),MAT.metal);br.position.set(.12,0,.6);head.add(br);const br2=br.clone();br2.position.x=-.12;head.add(br2);
  const eye=new T.Mesh(new T.BoxGeometry(.2,.08,.02),new T.MeshBasicMaterial({color:0xff3b2f}));eye.position.set(0,.1,.31);head.add(eye);addObj(g);
  const t={g,head,x,y:y0,z,yaw:SR()*TAU,hp:160,dead:false,cool:1,burst:0,see:0};W.turrets.push(t);
  const b={minX:x-.5,maxX:x+.5,minZ:z-.5,maxZ:z+.5,minY:y0,maxY:y0+1.4,solid:true,shoot:true,kind:'turret',turret:t};W.boxes.push(b);gridAdd(b);t.box=b;return t}
function tripwire(ax,az,bx,bz){const L=Math.hypot(bx-ax,bz-az);const m=new T.Mesh(new T.BoxGeometry(.015,.015,L),new T.MeshBasicMaterial({color:0xff2a2a}));m.position.set((ax+bx)/2,.32,(az+bz)/2);m.lookAt(bx,.32,bz);addObj(m);
  const p1=new T.Mesh(new T.BoxGeometry(.08,.4,.08),MAT.metal);p1.position.set(ax,.2,az);addObj(p1);const p2=p1.clone();p2.position.set(bx,.2,bz);addObj(p2);
  W.mines.push({ax,az,bx,bz,m,p1,p2,armed:true,fuse:0})}
function powerSwitch(x,y,z,face){const g=new T.Group();g.position.set(x,y,z);const box=new T.Mesh(new T.BoxGeometry(.6,.8,.25),MAT.yellow);g.add(box);
  const lever=new T.Mesh(new T.BoxGeometry(.08,.35,.08),MAT.metal);lever.position.set(0,.1,.18);lever.rotation.x=.6;g.add(lever);
  const led=new T.Mesh(new T.BoxGeometry(.12,.06,.02),new T.MeshBasicMaterial({color:0xff3020}));led.position.set(0,.3,.13);g.add(led);
  g.rotation.y={'z+':0,'z-':Math.PI,'x+':Math.PI/2,'x-':-Math.PI/2}[face]||0;addObj(g);
  const s={g,lever,led,pos:new T.Vector3(x,y,z),on:false};W.switches.push(s);return s}
function extractPoint(type,x,z,name){
  const col={std:0x72f5a8,paid:0xffb547,power:0xff4b3e,heli:0x9ad0ff,nobag:0x6db5ff}[type];
  const g=new T.Group();g.position.set(x,0,z);
  const ring=new T.Mesh(new T.RingGeometry(4.6,5,48),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);
  const beam=new T.Mesh(new T.CylinderGeometry(.5,.9,90,10,1,true),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false}));beam.position.y=45;g.add(beam);
  if(type==='heli'){const hm=new T.Mesh(new T.RingGeometry(3,3.4,32),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}));hm.rotation.x=-Math.PI/2;hm.position.y=.03;g.add(hm)}
  addObj(g);
  const e={type,name,pos:new T.Vector3(x,0,z),r:5,g,ring,beam,col,cost:type==='paid'?8000:0,active:type!=='power'&&type!=='heli',paid:false,heliT:0,heli:null};
  W.extracts.push(e);return e}
function flagPole(x,z,label){sbox(x,z,.15,.15,8,'metal',0,{uv:1});const cloth=new T.Mesh(new T.PlaneGeometry(2,1.2),new T.MeshBasicMaterial({color:0xcccccc,side:T.DoubleSide}));cloth.position.set(x+1.05,7.2,z);addObj(cloth);
  const ring=new T.Mesh(new T.RingGeometry(7.6,8,48),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.05,z);addObj(ring);
  W.flags.push({x,z,label,cloth,ring,v:0,owner:0,r:8})}

// building with optional 2nd floor, ladder, locked door
function building(cx,cz,w,d,o={}){
  const floors=o.floors||1,fh=3.3,h=floors===2?fh*2+.3:(o.h||srnd(4,5.5));const m=o.mat||spick(['wallA','wallB','wallC']);const t=.36;
  const sides=['n','s','e','w'];const doors=new Set(o.doors||[spick(sides)]);if(!o.doors&&!o.locked&&SR()<.55)doors.add(spick(sides));
  const doorPts=[];
  const mkOps=(len,door,floor)=>{const ops=[];const lim=len/2-1.8;if(door&&floor===0)ops.push({c:srnd(-lim,lim),w:2.2,b:0,t:2.6,door:1});
    const nW=Math.floor(len/4.2);for(let i=0;i<nW;i++){const c=-len/2+(i+.5)*len/nW;if(ops.some(p=>Math.abs(p.c-c)<2.4))continue;if(Math.abs(c)>len/2-1)continue;if(SR()<.68)ops.push(o.locked?{c,w:1.2,b:2.1,t:2.5}:{c,w:1.4,b:1.05,t:2.15})}
    return ops};
  const side=(name,axis,fixed,center,len,a,b)=>{for(let f=0;f<floors;f++){const y0=f*fh;const hh=f===floors-1?h-y0:fh;
      const ops=mkOps(len,doors.has(name),f).map(p=>({...p,c:p.c+center}));
      ops.filter(p=>p.door).forEach(p=>doorPts.push({x:axis==='x'?p.c:fixed,z:axis==='x'?fixed:p.c,axis,name}));
      wallRun(axis,fixed,a,b,y0,hh,m,ops,t)}};
  side('n','x',cz-d/2,cx,w,cx-w/2-t/2,cx+w/2+t/2);side('s','x',cz+d/2,cx,w,cx-w/2-t/2,cx+w/2+t/2);
  side('e','z',cx+w/2,cz,d,cz-d/2+t/2,cz+d/2-t/2);side('w','z',cx-w/2,cz,d,cz-d/2+t/2,cz+d/2-t/2);
  sbox(cx,cz,w+.8,d+.8,.32,'roof',h);
  sbox(cx,cz,w-.1,d-.1,.04,'floor',0,{solid:false,shoot:false,uv:2});
  // doors
  for(const p of doorPts){const lk=o.locked&&p===doorPts[0]?o.locked:null;if(lk||SR()<.6)makeDoor(p.x,p.z,p.axis,2.1,0,lk)}
  // second floor
  let stairZone=null;
  if(floors===2){const sw=1.4,len=10*.42;const sx=cx-w/2+.4+sw/2,sz0=cz-d/2+.6;stairs(sx,sz0,'z+',sw,fh,m);
    stairZone={minX:sx-sw/2-.2,maxX:sx+sw/2+.2,minZ:sz0-.2,maxZ:sz0+len+1.2};
    // slab with hole over stairs
    const y=fh,th=.25,x0=cx-w/2+.18,x1=cx+w/2-.18,z0=cz-d/2+.18,z1=cz+d/2-.18;
    sbox((stairZone.maxX+x1)/2,(z0+z1)/2,x1-stairZone.maxX,z1-z0,th,'floor',y-th);
    sbox((x0+stairZone.maxX)/2,(stairZone.maxZ+z1)/2,stairZone.maxX-x0,z1-stairZone.maxZ,th,'floor',y-th);
    // railing on hole edge
    sbox(stairZone.maxX+.05,(z0+stairZone.maxZ)/2-.6,.08,stairZone.maxZ-z0-1.4,1,'metal',y,{uv:1});
    W.roofSpots.push({x:cx+w/4,z:cz+d/4,y:fh,indoor:true});
  }
  if(o.ladder){const lf=spick(['n','s','e','w']);const top=h+.32;
    if(lf==='n')ladder(cx+srnd(-w/4,w/4),cz-d/2-t/2,'z-',top);else if(lf==='s')ladder(cx+srnd(-w/4,w/4),cz+d/2+t/2,'z+',top);
    else if(lf==='e')ladder(cx+w/2+t/2,cz+srnd(-d/4,d/4),'x+',top);else ladder(cx-w/2-t/2,cz+srnd(-d/4,d/4),'x-',top);
    sbox(cx,cz-d/2-.3,w+.8,.25,.9,m,h+.32);sbox(cx,cz+d/2+.3,w+.8,.25,.9,m,h+.32);
    W.roofSpots.push({x:cx,z:cz,y:h+.32,roof:true})}
  const spot=(y0)=>{for(let k=0;k<30;k++){const x=cx+srnd(-w/2+1.2,w/2-1.2),z=cz+srnd(-d/2+1.2,d/2-1.2);
      if(stairZone&&x>stairZone.minX-1&&x<stairZone.maxX+1&&z>stairZone.minZ-1&&z<stairZone.maxZ+1)continue;
      if(isFree(x,z,.9,y0)&&doorPts.every(p=>Math.hypot(p.x-x,p.z-z)>3))return{x,z}}return null};
  const lootTypes=o.lootTypes||['crate','crate','pc','med','weapon','safe'];
  const nl=o.loot!==undefined?o.loot:(1+(SR()<.5?1:0));
  for(let f=0;f<floors;f++){const y0=f*fh;const n=f===0?nl:Math.max(1,nl-1);
    for(let i=0;i<n;i++){const p=spot(y0);if(p)lootBox(p.x,p.z,o.vault&&f===0&&i===0?'vault':spick(lootTypes),y0)}
    const nc=1+(SR()*2|0);for(let i=0;i<nc;i++){const p=spot(y0);if(p&&y0===0)woodCrate(p.x,p.z)}}
  if(o.mine&&doorPts.length){const p=doorPts[0];const inward=1.2;if(p.axis==='x'){const dz=p.z<cz?inward:-inward;tripwire(p.x-1,p.z+dz,p.x+1,p.z+dz)}else{const dx=p.x<cx?inward:-inward;tripwire(p.x+dx,p.z-1,p.x+dx,p.z+1)}}
  W.enemySpots.push({x:cx,z:cz,indoor:true});
  return{h,doorPts}}

function yard(cx,cz,span=10){const rot=SR()<.5;
  for(const r of [-1,1]){if(SR()<.15)continue;const n=1+(SR()*2|0);for(let i=0;i<n;i++){const off=(i-(n-1)/2)*7.6;const x=rot?cx+r*5:cx+off,z=rot?cz+off:cz+r*5;if(!isFree(x,z,1.5))continue;container(x,z,rot);if(SR()<.35)container(x,z,rot,2.6)}}
  if(SR()<.7)lootBox(cx+srnd(-1,1),cz+srnd(-1,1),spick(['crate','weapon']));
  for(let i=0;i<3;i++){const x=cx+srnd(-span,span),z=cz+srnd(-span,span);if(isFree(x,z,1))woodCrate(x,z)}
  W.enemySpots.push({x:cx,z:cz})}
function field(cx,cz,span=11){
  for(let i=0;i<4;i++){const x=cx+srnd(-span,span),z=cz+srnd(-span,span),rot=SR()<.5,len=srnd(3,5);if(isFree(x,z,len/2+.5))sandbag(x,z,len,rot)}
  for(let i=0;i<3;i++){const x=cx+srnd(-span,span),z=cz+srnd(-span,span);if(isFree(x,z,1.6)){woodCrate(x,z);if(SR()<.5)woodCrate(x+srnd(-.1,.1),z+srnd(-.1,.1),1.2)}}
  for(let i=0;i<2;i++){barrel(cx+srnd(-span,span),cz+srnd(-span,span),SR()<.6)}
  if(SR()<.55)lootBox(cx+srnd(-8,8),cz+srnd(-8,8),'crate');
  W.enemySpots.push({x:cx,z:cz})}
function tower(x,z){const hgt=5;for(const [dx,dz] of [[-1.3,-1.3],[1.3,-1.3],[-1.3,1.3],[1.3,1.3]])sbox(x+dx,z+dz,.25,.25,hgt,'wood',0,{uv:1});
  sbox(x,z,3.2,3.2,.25,'wood',hgt);for(const s of [-1,1]){sbox(x,z+s*1.55,3.2,.12,1,'wood',hgt+.25);}sbox(x+1.55,z,.12,3.2,1,'wood',hgt+.25);
  sbox(x,z,3.6,3.6,.15,'roof',hgt+2.4);for(const [dx,dz] of [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]])sbox(x+dx,z+dz,.12,.12,2.2,'wood',hgt+.25,{uv:1});
  ladder(x-1.6,z,'x-',hgt+.25);W.roofSpots.push({x,z,y:hgt+.25,roof:true,tower:true})}
function rock(x,z,w,d,h){if(!isFree(x,z,Math.min(w,d)/2))return;sbox(x,z,w,d,h,'rock',0,{uv:4});if(h>2&&SR()<.6)sbox(x+srnd(-w/4,w/4),z+srnd(-d/4,d/4),w*.6,d*.6,h*.5,'rock',h,{uv:4})}
function scatter(n,minEdge=8){for(let i=0;i<n;i++){const x=srnd(-W.half+minEdge,W.half-minEdge),z=srnd(-W.half+minEdge,W.half-minEdge);
  if(W.spawnsP.some(c=>Math.hypot(c.x-x,c.z-z)<14)||W.extracts.some(e=>Math.hypot(e.pos.x-x,e.pos.z-z)<9))continue;
  const r=SR();if(r<.35){if(isFree(x,z,1.6))woodCrate(x,z)}else if(r<.6){const len=srnd(3,5);if(isFree(x,z,len/2+.6))sandbag(x,z,len,SR()<.5)}else if(r<.75)barrel(x,z,SR()<.5);else if(r<.85){if(isFree(x,z,4))container(x,z,SR()<.5)}else if(r<.92)lootBox(x,z,'crate')}}

/* ---------- MAP: 灰區鎮 ---------- */
function genTown(){const h=W.half,CS=30;
  for(const c of [-75,-45,-15,15,45,75]){road(c,0,7,h*2-4);road(0,c,h*2-4,7)}
  W.spawnsP=[{x:-108,z:-108},{x:108,z:-108},{x:108,z:108},{x:-108,z:108}];
  // command post
  building(0,0,20,15,{floors:2,doors:['n','s','e','w'],loot:2,vault:false,lootTypes:['crate','safe','weapon','pc'],mat:'dark'});
  for(const [x,z] of [[0,-12],[0,12],[-14,0],[14,0]])sandbag(x,z,6,x!==0);
  turret(-8,-12.5);turret(8,12.5);camDevice(-10.2,3.2,-7.7,Math.PI*1.25);camDevice(10.2,3.2,7.7,Math.PI*.25);
  powerSwitch(-9.6,1.3,6.9,'z-');W.bossSpot={x:2,z:2};
  const specials=SR()<.5?[[-2,1],[2,-1]]:[[1,2],[-1,-2]];let bank=specials[0],clinic=specials[1];
  for(let gx=-3;gx<=3;gx++)for(let gz=-3;gz<=3;gz++){if(Math.abs(gx)<=0&&Math.abs(gz)<=0)continue;if(Math.abs(gx)===3&&Math.abs(gz)===3)continue;
    const cx=gx*CS+srnd(-2,2),cz=gz*CS+srnd(-2,2);
    if(gx===bank[0]&&gz===bank[1]){building(cx,cz,16,12,{floors:1,h:5,locked:'R',vault:true,loot:2,lootTypes:['safe','vault'],mat:'wallB',mine:true});continue}
    if(gx===clinic[0]&&gz===clinic[1]){building(cx,cz,14,11,{floors:2,loot:2,lootTypes:['med','med','crate','pc'],mat:'wallC'});continue}
    const r=SR();
    if(r<.55)building(cx,cz,srnd(10,17),srnd(9,14),{floors:SR()<.35?2:1,ladder:SR()<.4,mine:SR()<.12});
    else if(r<.75)yard(cx,cz);else field(cx,cz)}
  for(const [x,z] of [[-100,0],[100,0],[0,-100],[0,100]])tower(x+srnd(-4,4),z+srnd(-4,4));
  for(const c of [-45,-15,15,45])for(const c2 of [-45,-15,15,45])lamp(c+3.6,c2+3.6);
  extractPoint('std',-112,40,'西側林道');extractPoint('std',40,112,'南邊隧道');extractPoint('std',112,-40,'東側檢查哨');
  extractPoint('paid',-40,-112,'地下走私通道');extractPoint('power',112,60,'電動閘門');extractPoint('heli',-60,60,'直升機坪');extractPoint('nobag',60,-75,'排水管');
  scatter(150);
  // gate for power extract
  W.powerGate=dbox(118,60,1,10,5,'metal',0);
  W.flagsPos=[[0,-22,'A'],[-60,-60,'B'],[60,60,'C'],[60,-60,'D'],[-60,60,'E']];W.basePos={1:{x:-108,z:0},2:{x:108,z:0}}}

/* ---------- MAP: 鐵鏽港 ---------- */
function genHarbor(){const h=W.half;
  // water east
  const water=new T.Mesh(new T.PlaneGeometry(400,600),new T.MeshStandardMaterial({color:THEME.water,roughness:.2,metalness:.5,transparent:true,opacity:.92}));water.rotation.x=-Math.PI/2;water.position.set(112+200,.05,0);scene.add(water);W.meshes.push(water);
  sbox(111,0,2,h*2,1.2,'dark',-1.2);
  W.clampExtra=p=>{if(p.x>110){const onShip=p.z>-46&&p.z<46&&p.x<132;if(!onShip)p.x=110}};
  // quay
  road(100,0,18,h*2-6);road(0,-70,h*2-40,8);road(0,70,h*2-40,8);road(-20,0,8,h*2-20);
  // cranes
  for(let z=-110;z<=110;z+=55){const x=101;for(const [dx,dz] of [[-6,-4],[6,-4],[-6,4],[6,4]])sbox(x+dx,z+dz,.8,.8,22,'yellow',0,{uv:2});
    sbox(x,z,14,9,1.4,'yellow',22);sbox(x+8,z,30,2,1.6,'yellow',23.4,{solid:false});W.roofSpots.push({x,z,y:23.4,roof:true,crane:true});ladder(x-7.05,z-2,'x-',23.4)}
  // ship
  const sx=121,sz=0;sbox(sx,sz,18,90,6,'hull',0);sbox(sx,sz,18.4,.4,1.2,'metal',6);
  for(const s of [-1,1]){sbox(sx,sz+s*45.2,18.4,.4,1.2,'metal',6);}sbox(sx+9.2,sz,.4,90,1.2,'metal',6);sbox(sx-9.2,sz+12,.4,66,1.2,'metal',6);
  // gangway (stairs from quay to deck)
  stairs(104,-40,'x+',2.4,6,'metal');
  // ship bridge
  building(sx+2,sz+34,12,10,{h:4,floors:1,doors:['n'],loot:2,lootTypes:['safe','crate','pc'],mat:'wallA'});
  for(let i=0;i<5;i++){const z=sz-30+i*12;container(sx-3,z,false,6,null);if(SR()<.5)container(sx+3,z,false,6)}
  lootBox(sx,sz-6,'weapon',6);lootBox(sx+5,sz+8,'crate',6);
  W.roofSpots.push({x:sx,z:sz+25,y:6,roof:true});
  // container yard
  for(let x=-50;x<=80;x+=13){for(let z=-120;z<=120;z+=9){if(Math.abs(z)<74&&Math.abs(z)>66)continue;if(Math.abs(x+20)<6)continue;if(SR()<.32)continue;
    const st=1+(SR()*3|0);for(let k=0;k<st;k++)container(x,z,false,k*2.6);if(st>=2&&SR()<.3&&isFree(x-2.3,z+3,.7))stairs(x-2.3,z+1.22+8*.42,'z-',1.2,2.6,'metal');}}
  for(let i=0;i<14;i++){const x=srnd(-50,80),z=srnd(-115,115);if(isFree(x,z,1))lootBox(x,z,spick(['crate','crate','weapon']))}
  for(let i=0;i<10;i++)W.enemySpots.push({x:srnd(-45,80),z:srnd(-110,110)});
  // warehouses
  for(const z of [-90,-30,30,90]){const cx=-100,cz=z;building(cx,cz,30,20,{h:8,floors:1,doors:['e','w','n'],loot:4,lootTypes:['crate','crate','weapon','safe','pc'],mat:'wallB',ladder:true});
    for(let i=0;i<3;i++){const sx2=cx-9+i*9;sbox(sx2,cz,1.2,10,3.2,'metal',0,{uv:1});}}
  // office with server room
  building(-55,-118+14,22,14,{floors:2,locked:'B',vault:true,loot:3,lootTypes:['pc','pc','safe','vault'],mat:'wallC',mine:true});
  camDevice(-66.2,3,-111,-Math.PI*.6);turret(-44,-100);
  // fuel tanks
  for(const [x,z] of [[-115,120],[-100,120],[-85,120]]){const m=new T.Mesh(new T.CylinderGeometry(5,5,10,20),MAT.wallC);m.position.set(x,5,z);m.castShadow=m.receiveShadow=true;scene.add(m);W.meshes.push(m);
    const b={minX:x-4.4,maxX:x+4.4,minZ:z-4.4,maxZ:z+4.4,minY:0,maxY:10,solid:true,shoot:true};W.boxes.push(b);gridAdd(b)}
  for(let i=0;i<6;i++)barrel(srnd(-120,-80),srnd(100,112),true);
  powerSwitch(-86,1.3,-80,'x+');
  W.spawnsP=[{x:-135,z:-135},{x:-135,z:135},{x:40,z:-138},{x:40,z:138}];
  for(const x of [-60,-20,20,60,95])for(const z of [-70,70])lamp(x+4.5,z+4.5);
  extractPoint('std',-140,0,'西門');extractPoint('std',70,-140,'南側卸貨區');extractPoint('nobag',128,40,'救生艇');
  extractPoint('paid',-20,140,'走私貨車');extractPoint('power',70,140,'北側電閘');extractPoint('heli',-10,-25,'港務直升機坪');
  W.powerGate=dbox(70,146,10,1,5,'metal',0);
  scatter(110);W.bossSpot={x:sx,z:sz-12,y:6};
  W.flagsPos=[[121,0,'A'],[-100,-30,'B'],[15,0,'C'],[-55,-90,'D'],[30,100,'E']];W.basePos={1:{x:-138,z:120},2:{x:60,z:-130}}}

/* ---------- MAP: 寒脊研究站 ---------- */
function genFrost(){const h=W.half;
  // ridges
  for(const z of [-70,70]){for(let x=-h+10;x<h-10;x+=9){if(Math.abs(x-(z>0?-30:40))<14||Math.abs(x-(z>0?80:-90))<10)continue;rock(x,z+srnd(-3,3),srnd(8,11),srnd(5,9),srnd(4,9))}}
  for(let i=0;i<40;i++)rock(srnd(-h+10,h-10),srnd(-h+10,h-10),srnd(3,8),srnd(3,8),srnd(1.5,5));
  // research compound
  road(0,0,60,6);road(0,0,6,60);
  building(-14,-14,18,13,{floors:2,doors:['s','e'],loot:3,lootTypes:['pc','pc','safe','crate'],mat:'wallB'});
  building(14,-14,16,12,{floors:1,h:5,doors:['s','w'],locked:'R',vault:true,loot:2,lootTypes:['vault','safe'],mat:'wallA',mine:true});
  building(-14,14,16,12,{floors:1,h:4.5,doors:['n','e'],loot:2,lootTypes:['med','med','crate'],mat:'wallC'});
  building(14,14,18,13,{floors:2,doors:['n','w'],loot:2,lootTypes:['pc','weapon','crate'],mat:'wallB',ladder:true});
  for(const [x,z] of [[0,-24],[0,24],[-25,0],[25,0]])sandbag(x,z,6,x!==0);
  turret(-4,-4);turret(4,4);camDevice(-22.9,3,-8,Math.PI*1.5);camDevice(22.9,3,8,Math.PI*.5);W.bossSpot={x:-14,z:-10};
  powerSwitch(-6.1,1.3,14,'x+');
  // radar dome
  {const x=45,z=-35;sbox(x,z,8,8,4,'wallA',0);const dm=new T.Mesh(new T.SphereGeometry(5,20,14,0,TAU,0,Math.PI/2),MAT.wallC);dm.position.set(x,4,z);dm.castShadow=true;scene.add(dm);W.meshes.push(dm);sbox(x,z,7,7,4,null,4);lootBox(x+5,z,'pc');W.enemySpots.push({x:x+6,z})}
  // comm tower
  {const x=-60,z=40;for(const [dx,dz] of [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]])sbox(x+dx,z+dz,.3,.3,14,'metal',0,{uv:1});sbox(x,z,4,4,.3,'metal',14);ladder(x-1.8,z,'x-',14.3);W.roofSpots.push({x,z,y:14.3,roof:true,tower:true})}
  // bunkers
  for(const [x,z] of [[80,-100],[-90,-100],[95,100],[-100,95]]){sbox(x,z,10,8,2.6,'dark',0);for(const s of [-1,1])sbox(x,z+s*4.2,10,.4,2.2,'dark',0);sbox(x+5.2,z,.4,8.8,2.2,'dark',0);
    lootBox(x-2,z,'weapon');lootBox(x+2,z+2,'crate');W.enemySpots.push({x,z})}
  // cabins
  for(let i=0;i<8;i++){const x=srnd(-120,-50),z=srnd(-50,50);if(isFree(x,z,8))building(x,z,srnd(8,11),srnd(7,9),{h:3.6,mat:'wood',loot:1,lootTypes:['crate','med','pc']})}
  for(let i=0;i<6;i++){const x=srnd(50,120),z=srnd(-55,55);if(isFree(x,z,8))building(x,z,srnd(9,14),srnd(8,11),{h:4,floors:SR()<.3?2:1,loot:1})}
  for(let i=0;i<6;i++){const x=srnd(-110,110),z=srnd(85,125);if(isFree(x,z,8))building(x,z,srnd(9,13),srnd(8,10),{h:4,loot:1})}
  for(let i=0;i<6;i++){const x=srnd(-110,110),z=srnd(-125,-85);if(isFree(x,z,8))building(x,z,srnd(9,13),srnd(8,10),{h:4,loot:1,ladder:SR()<.4})}
  for(const [x,z] of [[-100,0],[100,-5]])tower(x,z);
  W.spawnsP=[{x:-125,z:-125},{x:125,z:-125},{x:125,z:125},{x:-125,z:125}];
  for(const c of [-20,20])for(const c2 of [-20,20])lamp(c+3.5,c2+3.5);
  extractPoint('std',-130,-10,'西側纜車站');extractPoint('std',130,10,'東側雪道');extractPoint('nobag',-30,130,'冰縫小徑');
  extractPoint('paid',40,-130,'補給車隊');extractPoint('power',0,-130,'南側隧道');extractPoint('heli',60,60,'研究站直升機坪');
  W.powerGate=dbox(0,-136,10,1,5,'metal',0);
  scatter(80);
  W.flagsPos=[[0,0,'A'],[-60,40,'B'],[45,-35,'C'],[-90,-100,'D'],[95,100,'E']];W.basePos={1:{x:-125,z:0},2:{x:125,z:0}}}

/* ================= nav grid + A* ================= */
function buildNav(){const res=2,n=Math.ceil(W.half*2/res),g=new Uint8Array(n*n);const o=-W.half;
  for(const b of W.boxes){if(!b.solid||b.off||b.kind==='door'&&!b.door.locked)continue;if(b.minY>1.6||b.maxY<.5)continue;
    const x0=Math.max(0,Math.floor((b.minX-.45-o)/res)),x1=Math.min(n-1,Math.floor((b.maxX+.45-o)/res)),z0=Math.max(0,Math.floor((b.minZ-.45-o)/res)),z1=Math.min(n-1,Math.floor((b.maxZ+.45-o)/res));
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const cx=o+(x+.5)*res,cz=o+(z+.5)*res;if(cx>b.minX-.9&&cx<b.maxX+.9&&cz>b.minZ-.9&&cz<b.maxZ+.9)g[z*n+x]=1}}
  W.nav={res,n,g,o}}
function navCell(x,z){const N=W.nav;return[clamp(Math.floor((x-N.o)/N.res),0,N.n-1),clamp(Math.floor((z-N.o)/N.res),0,N.n-1)]}
function navFree(cx,cz){const N=W.nav;return cx>=0&&cz>=0&&cx<N.n&&cz<N.n&&!N.g[cz*N.n+cx]}
function navNearestFree(cx,cz){if(navFree(cx,cz))return[cx,cz];for(let r=1;r<6;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(navFree(cx+dx,cz+dz))return[cx+dx,cz+dz];return null}
let _heap=[],_gs=null,_from=null,_closed=null,_mark=1,_markArr=null;
function findPath(sx,sz,tx,tz,maxN=5000){const N=W.nav;const n=N.n;
  if(!_gs||_gs.length!==n*n){_gs=new Float32Array(n*n);_from=new Int32Array(n*n);_markArr=new Uint32Array(n*n);_closed=new Uint32Array(n*n)}
  const s=navNearestFree(...navCell(sx,sz)),t=navNearestFree(...navCell(tx,tz));if(!s||!t)return null;
  const mk=++_mark;const si=s[1]*n+s[0],ti=t[1]*n+t[0];_heap.length=0;
  const hfn=i=>{const x=i%n,z=(i/n)|0,dx=Math.abs(x-t[0]),dz=Math.abs(z-t[1]);return(dx+dz)+(1.414-2)*Math.min(dx,dz)};
  const push=(i,f)=>{_heap.push([f,i]);let k=_heap.length-1;while(k>0){const p=(k-1)>>1;if(_heap[p][0]<=_heap[k][0])break;[_heap[p],_heap[k]]=[_heap[k],_heap[p]];k=p}};
  const pop=()=>{const top=_heap[0],last=_heap.pop();if(_heap.length){_heap[0]=last;let k=0;for(;;){const l=k*2+1,r=l+1;let m=k;if(l<_heap.length&&_heap[l][0]<_heap[m][0])m=l;if(r<_heap.length&&_heap[r][0]<_heap[m][0])m=r;if(m===k)break;[_heap[m],_heap[k]]=[_heap[k],_heap[m]];k=m}}return top};
  _markArr[si]=mk;_gs[si]=0;_from[si]=-1;push(si,hfn(si));let found=false,exp=0;
  while(_heap.length&&exp++<maxN){const [,i]=pop();if(_closed[i]===mk)continue;_closed[i]=mk;if(i===ti){found=true;break}
    const x=i%n,z=(i/n)|0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(!navFree(nx,nz))continue;if(dx&&dz&&(!navFree(x+dx,z)||!navFree(x,z+dz)))continue;
      const j=nz*n+nx,c=_gs[i]+(dx&&dz?1.414:1);if(_markArr[j]===mk&&c>=_gs[j])continue;_markArr[j]=mk;_gs[j]=c;_from[j]=i;push(j,c+hfn(j))}}
  if(!found)return null;const path=[];let i=ti;while(i!==-1){path.push(i);i=_from[i]}path.reverse();
  // smooth with grid line-of-walk
  const pts=path.map(i=>({x:N.o+((i%n)+.5)*N.res,z:N.o+(((i/n)|0)+.5)*N.res}));
  const out=[pts[0]];let a=0;for(let k=2;k<pts.length;k++){if(!navLine(pts[a],pts[k])){out.push(pts[k-1]);a=k-1}}out.push(pts[pts.length-1]);return out}
function navLine(a,b){const N=W.nav;const d=Math.hypot(b.x-a.x,b.z-a.z),st=Math.ceil(d/(N.res*.5));for(let i=1;i<st;i++){const x=a.x+(b.x-a.x)*i/st,z=a.z+(b.z-a.z)*i/st;const [cx,cz]=navCell(x,z);if(!navFree(cx,cz))return false}return true}

/* ================= time of day ================= */
let stars=null;
function applyTOD(tod){const th=THEME;const sky=th.sky[tod]||th.sky.day;
  const P={day:{fn:35,ff:230,hs:th.snowy?0xe6eef8:0xe6d6b8,hg:th.snowy?0x8a96a6:0x4a3d2e,hi:.8,sc:th.snowy?0xfff4e8:0xffd6a3,si:1.75,dir:[70,95,40],ex:th.snowy?.95:1.05,lamp:0},
    dusk:{fn:25,ff:170,hs:0xf0b080,hg:0x3a2a2a,hi:.55,sc:0xff8a4a,si:1.45,dir:[110,26,-30],ex:1,lamp:.5},
    night:{fn:8,ff:85,hs:0x4a5a88,hg:0x0a0a10,hi:.34,sc:0x8aa4ff,si:.3,dir:[-50,90,60],ex:1.15,lamp:1}}[tod]||null;
  const p=P||{};scene.background.setHex(sky);scene.fog.color.setHex(sky);scene.fog.near=p.fn;scene.fog.far=p.ff;
  hemi.color.setHex(p.hs);hemi.groundColor.setHex(p.hg);hemi.intensity=p.hi;sun.color.setHex(p.sc);sun.intensity=p.si;sunDir.set(...p.dir).normalize();renderer.toneMappingExposure=p.ex;
  if(!stars){const n=700,a=new Float32Array(n*3);for(let i=0;i<n;i++){const t=Math.random()*TAU,q=Math.random()*1.3,r=450;a[i*3]=Math.cos(t)*Math.cos(q)*r;a[i*3+1]=Math.sin(q)*r+10;a[i*3+2]=Math.sin(t)*Math.cos(q)*r}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));stars=new T.Points(g,new T.PointsMaterial({color:0xdde6ff,size:1.6,sizeAttenuation:false,fog:false}));scene.add(stars)}
  stars.visible=tod==='night';
  if(W){W.lampOn=p.lamp;W.glows.forEach(g=>g.visible=p.lamp>0);if(W.bulbMat)W.bulbMat.color.setHex(p.lamp?0xffe2b0:0x6b6458)}
  W&&(W.tod=tod);
}
function updateLamps(){if(!W||!W.lampOn){lampLights.forEach(l=>l.intensity=0);return}
  const c=camera.position;const s=W.lampPos.slice().sort((a,b)=>a.distanceToSquared(c)-b.distanceToSquared(c));
  lampLights.forEach((l,i)=>{const p=s[i];if(p){l.position.copy(p);l.intensity=W.lampOn*1.8}else l.intensity=0})}
