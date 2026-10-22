'use strict';
/* ================= mechanisms ================= */
const zipMat=new T.MeshStandardMaterial({color:0x2a2a28,roughness:.5,metalness:.6});
const padMat=new T.MeshBasicMaterial({color:0x5ff0ff});
function zipline(ax,ay,az,bx,by,bz){const a=new T.Vector3(ax,ay+1.6,az),b=new T.Vector3(bx,by+1.6,bz);const L=a.distanceTo(b);
  const m=new T.Mesh(new T.CylinderGeometry(.03,.03,L,6),zipMat);m.position.copy(a).lerp(b,.5);m.lookAt(b);m.rotateX(Math.PI/2);addObj(m);
  sbox(bx,bz,.22,.22,by+2,'metal',0,{uv:1});
  const h=new T.Mesh(new T.TorusGeometry(.18,.04,6,12),new T.MeshBasicMaterial({color:0xffb547}));h.position.set(ax,ay+1.4,az);addObj(h);
  W.ziplines.push({a,b,L,ay,start:new T.Vector3(ax,ay,az)})}
function jumpPad(x,z,vx,vz,vy,y0=0){const m=new T.Mesh(new T.CylinderGeometry(1.1,1.2,.16,20),padMat);m.position.set(x,y0+.08,z);addObj(m);
  const r=new T.Mesh(new T.RingGeometry(1.25,1.45,24),new T.MeshBasicMaterial({color:0x5ff0ff,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(x,y0+.18,z);addObj(r);
  W.pads.push({x,y:y0,z,vx,vz,vy,ring:r})}
function boards(x,z,axis,w,h,y0=0){const g=new T.Group();g.position.set(x,y0,z);
  for(let i=0;i<4;i++){const p=new T.Mesh(new T.BoxGeometry(axis==='x'?w:.08,.32,axis==='x'?.08:w),MAT.wood);p.position.set(0,.4+i*.6,0);p.rotation[axis==='x'?'z':'x']=(i%2?.08:-.08);p.castShadow=true;g.add(p)}addObj(g);
  const b={minX:axis==='x'?x-w/2:x-.06,maxX:axis==='x'?x+w/2:x+.06,minZ:axis==='x'?z-.06:z-w/2,maxZ:axis==='x'?z+.06:z+w/2,minY:y0,maxY:y0+h,solid:true,shoot:true,kind:'board'};
  W.boxes.push(b);gridAdd(b);b.board={g,hp:40,x,z};W.breakables.push(b)}
function breakBoard(b){if(!b.board||b.off)return;b.off=true;b.board.g.visible=false;emit(new T.Vector3(b.board.x,1.2,b.board.z),18,'dust',5,.8,.12,9.8);noiseHit(.4,500,.4)}
function elevator(x,z,w,d,y0,y1){const m=new T.Mesh(new T.BoxGeometry(w,.3,d),MAT.yellow);m.castShadow=m.receiveShadow=true;m.position.set(x,y0+.15,z);addObj(m);
  for(const [dx,dz] of [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]])sbox(x+dx,z+dz,.12,.12,y1+.8,'metal',0,{solid:false,shoot:false,uv:1});
  const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y0,maxY:y0+.3,solid:true,shoot:true,kind:'lift'};W.boxes.push(b);gridAdd(b);
  W.elevators.push({b,m,y0,y1,y:y0,dir:1,wait:2})}
function gasZone(x,z,r){W.gas.push({x,z,r});const ring=new T.Mesh(new T.RingGeometry(r-.3,r,40),new T.MeshBasicMaterial({color:0x9ad06a,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.06,z);addObj(ring);
  for(let i=0;i<5;i++)barrel(x+srnd(-r*.6,r*.6),z+srnd(-r*.6,r*.6),false)}
function ammoStation(x,z,y0=0){if(!isFree(x,z,.9,y0))return;sbox(x,z,1.2,.8,1,'yellow',y0,{uv:1});const si=stripAt(x,y0+.75,z+.41,.9,0x5ff0ff);W.ammoSt.push({x,z,y:y0,pos:new T.Vector3(x,y0+.5,z),cd:0,strip:si})}
function searchlight(x,y,z,yaw){const c=camDevice(x,y,z,yaw);c.search=true;c.hp=40;
  const cone=new T.Mesh(new T.ConeGeometry(7,45,16,1,true),new T.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  cone.position.set(0,0,22.5);cone.rotation.x=-Math.PI/2;const pivot=new T.Group();pivot.rotation.x=.38;pivot.add(cone);c.g.add(pivot);c.cone=cone;return c}
function tree(x,z,s=1){if(!isFree(x,z,.6))return;(W.treeList||(W.treeList=[])).push([x,z,s*srnd(.8,1.3)]);sbox(x,z,.55*s,.55*s,4*s,null,0)}
function buildTrees(){const L=W.treeList,n=L.length;const sn=THEME.snowy;
  const fol=new T.InstancedMesh(new T.ConeGeometry(2.2,6,7),new T.MeshStandardMaterial({color:sn?0x4f6b5a:0x3f5a32,roughness:1,flatShading:true}),n*2);
  const tr=new T.InstancedMesh(new T.CylinderGeometry(.22,.3,3,6),new T.MeshStandardMaterial({color:0x4a3826,roughness:1}),n);
  const q=new T.Quaternion(),v=new T.Vector3(),s=new T.Vector3();
  L.forEach(([x,z,k],i)=>{v.set(x,1.5*k,z);s.set(k,k,k);_m4.compose(v,q,s);tr.setMatrixAt(i,_m4);v.set(x,4.6*k,z);_m4.compose(v,q,s);fol.setMatrixAt(i*2,_m4);v.set(x,6.6*k,z);s.set(k*.7,k*.7,k*.7);_m4.compose(v,q,s);fol.setMatrixAt(i*2+1,_m4)});
  fol.castShadow=tr.castShadow=true;fol.receiveShadow=true;scene.add(fol);scene.add(tr);W.meshes.push(fol,tr);
  if(sn){const cap=new T.InstancedMesh(new T.ConeGeometry(1.2,1.6,7),new T.MeshStandardMaterial({color:0xeef3f8,roughness:1,flatShading:true}),n);L.forEach(([x,z,k],i)=>{v.set(x,8.1*k,z);s.set(k,k,k);_m4.compose(v,q,s);cap.setMatrixAt(i,_m4)});scene.add(cap);W.meshes.push(cap)}}
function forest(n,x0,z0,x1,z1,s=1){for(let i=0;i<n;i++)tree(srnd(x0,x1),srnd(z0,z1),s)}
// jump pad that launches toward a target point (lands near it)
function padTo(x,z,tx,tz,ty){const T_=1.3;const vy=Math.max(10,(ty+.9+GRAV*T_*T_/2)/T_),vx=(tx-x)/T_,vz=(tz-z)/T_;jumpPad(x,z,vx,vz,vy)}

/* ================= MAP: 灰區鎮 (330 m) ================= */
function genTown(){const h=W.half,CS=34;
  for(const c of [-119,-85,-51,-17,17,51,85,119]){road(c,0,7,h*2-6);road(0,c,h*2-6,7)}
  W.spawnsP=[{x:-148,z:-148},{x:148,z:-148},{x:148,z:148},{x:-148,z:148}];
  // command post with elevator to roof
  const cp=building(0,0,22,16,{floors:2,doors:['n','s','e','w'],loot:3,lootTypes:['crate','safe','weapon','pc'],mat:'dark'});
  elevator(-12.6,4,2.4,2.4,0,cp.h+.02);sbox(-11,-6.5,3.2,.25,1,'dark',cp.h+.32);
  for(const [x,z] of [[0,-13],[0,13],[-16,0],[16,0]])sandbag(x,z,6,x!==0);
  turret(-8,-13.5);turret(8,13.5);camDevice(-11.2,3.2,-8.7,Math.PI*1.25);camDevice(11.2,3.2,8.7,Math.PI*.25);
  powerSwitch(-10.6,1.3,7.9,'z-');W.bossSpot={x:2,z:2};ammoStation(5,-12);ammoStation(-5,12);
  const pickCell=()=>[Math.round(srnd(-3,3)),Math.round(srnd(-3,3))];let bank=pickCell(),clinic=pickCell(),depot=pickCell();
  for(let gx=-4;gx<=4;gx++)for(let gz=-4;gz<=4;gz++){if(!gx&&!gz)continue;if(Math.abs(gx)===4&&Math.abs(gz)===4)continue;
    const cx=gx*CS+srnd(-2,2),cz=gz*CS+srnd(-2,2);
    if(gx===bank[0]&&gz===bank[1]){building(cx,cz,16,12,{floors:1,h:5,locked:'R',vault:true,loot:2,lootTypes:['safe','vault'],mat:'wallB',mine:true});continue}
    if(gx===clinic[0]&&gz===clinic[1]){building(cx,cz,14,11,{floors:2,loot:2,lootTypes:['med','med','crate','pc'],mat:'wallC'});continue}
    if(gx===depot[0]&&gz===depot[1]){yard(cx,cz);gasZone(cx+srnd(-4,4),cz+srnd(-4,4),7);continue}
    const r=SR();
    if(r<.58){const w=srnd(10,17),d=srnd(9,14);const two=SR()<.35;const b=building(cx,cz,w,d,{floors:two?2:1,ladder:SR()<.35,mine:SR()<.1});
      if(!two&&b.h<5.6&&SR()<.3){const side=SR()<.5?1:-1;const px=cx,pz=cz+side*(d/2+3.2);if(isFree(px,pz,1.3))padTo(px,pz,cx,cz+side*(d/2-2.5),b.h+.32)}}
    else if(r<.78)yard(cx,cz);else field(cx,cz)}
  const towers=[[-135,0],[135,0],[0,-135],[0,135]];
  for(const [x,z] of towers){tower(x,z);const ix=x*.78,iz=z*.78;zipline(x,5.25,z,ix,0,iz);if(z===0)searchlight(x+(x>0?-1.7:1.7),7,z,x>0?-Math.PI/2:Math.PI/2);else searchlight(x,7,z+(z>0?-1.7:1.7),z>0?Math.PI:0);ammoStation(x+3,z+3)}
  for(const c of [-85,-51,-17,17,51,85])for(const c2 of [-85,-51,-17,17,51,85])if(SR()<.5)lamp(c+3.6,c2+3.6);
  extractPoint('std',-158,50,'西側林道');extractPoint('std',50,158,'南邊隧道');extractPoint('std',158,-50,'東側檢查哨');extractPoint('std',-50,-158,'北方廢鐵場');
  extractPoint('paid',-90,-150,'地下走私通道');extractPoint('power',158,80,'電動閘門');extractPoint('heli',-80,80,'直升機坪');extractPoint('nobag',80,-100,'排水管');
  W.powerGate=dbox(164,80,1,10,5,'metal',0);
  scatter(220);
  W.flagsPos=[[0,-24,'A'],[-75,-75,'B'],[75,75,'C'],[75,-75,'D'],[-75,75,'E']];W.basePos={1:{x:-150,z:0},2:{x:150,z:0}};W.relicPos={x:0,z:-26};W.holdPos={x:0,z:0};W.duelSpots=[{x:-17,z:-60},{x:-17,z:-10}]}

/* ================= MAP: 鐵鏽港 (380 m) ================= */
function genHarbor(){const h=W.half;
  const water=new T.Mesh(new T.PlaneGeometry(500,700),new T.MeshStandardMaterial({color:THEME.water,roughness:.2,metalness:.5,transparent:true,opacity:.92}));water.rotation.x=-Math.PI/2;water.position.set(141+250,.05,0);scene.add(water);W.meshes.push(water);
  sbox(141,0,2,h*2,1.2,'dark',-1.2,{solid:false});
  const sx=158;
  W.clampExtra=p=>{if(p.x>140){const onShip=p.z>-46&&p.z<46&&p.x<168;if(!onShip)p.x=140}};
  W.navBlock=(x,z)=>x>140;
  road(130,0,20,h*2-6);road(0,-90,h*2-50,8);road(0,90,h*2-50,8);road(-25,0,8,h*2-20);
  for(let z=-150;z<=150;z+=60){const x=129;for(const [dx,dz] of [[-6,-4],[6,-4],[-6,4],[6,4]])sbox(x+dx,z+dz,.8,.8,22,'yellow',0,{uv:2});
    sbox(x,z,14,9,1.4,'yellow',22);sbox(x+8,z,30,2,1.6,'yellow',23.4,{solid:false});W.roofSpots.push({x,z,y:23.4,roof:true,crane:true});
    elevator(x-8.4,z,2.4,2.4,0,23.1);searchlight(x+6.5,23,z,Math.PI*.5+srnd(-.6,.6));zipline(x-4,23.4,z+2,x-48,0,z+srnd(-8,8))}
  // ship
  sbox(sx,0,18,90,6,'hull',0);
  for(const s of [-1,1])sbox(sx,s*45.2,18.4,.4,1.2,'metal',6);sbox(sx+9.2,0,.4,90,1.2,'metal',6);sbox(sx-9.2,12,.4,66,1.2,'metal',6);
  stairs(141.4,-40,'x+',2.4,6,'metal');
  building(sx+2,34,12,10,{h:4,floors:1,doors:['n'],loot:2,lootTypes:['safe','crate','pc'],mat:'wallA'});
  for(let i=0;i<5;i++){const z=-30+i*12;container(sx-3,z,false,6);if(SR()<.5)container(sx+3,z,false,6)}
  lootBox(sx,-6,'weapon',6);lootBox(sx+5,8,'crate',6);ammoStation(sx-6,-20,6);W.roofSpots.push({x:sx,z:25,y:6,roof:true});
  // container yard
  for(let x=-70;x<=112;x+=13){for(let z=-160;z<=160;z+=9){if(Math.abs(Math.abs(z)-90)<5)continue;if(Math.abs(x+25)<6)continue;if(SR()<.32)continue;
    const st=1+(SR()*3|0);for(let k=0;k<st;k++)container(x,z,false,k*2.6);if(st>=2&&SR()<.3&&isFree(x-2.3,z+3,.7))stairs(x-2.3,z+1.22+8*.42,'z-',1.2,2.6,'metal');}}
  for(let i=0;i<22;i++){const x=srnd(-70,112),z=srnd(-155,155);if(isFree(x,z,1))lootBox(x,z,spick(['crate','crate','weapon']))}
  for(let i=0;i<10;i++){const x=srnd(-60,100),z=srnd(-150,150);if(isFree(x,z,1.6)){const tz=z+(z>0?-4:4);jumpPad(x,z,0,0,12)}}
  for(let i=0;i<14;i++)W.enemySpots.push({x:srnd(-65,110),z:srnd(-150,150)});
  // warehouses
  for(const z of [-130,-65,0,65,130]){const cx=-145,cz=z;building(cx,cz,30,22,{h:8,floors:1,doors:['e','w','n'],loot:4,lootTypes:['crate','crate','weapon','safe','pc'],mat:'wallB',ladder:true});
    for(let i=0;i<3;i++)sbox(cx-9+i*9,cz,1.2,10,3.2,'metal',0,{uv:1});ammoStation(cx+17,cz+8)}
  building(-75,-178+16,22,14,{floors:2,locked:'B',vault:true,loot:3,lootTypes:['pc','pc','safe','vault'],mat:'wallC',mine:true});
  camDevice(-86.2,3,-155,-Math.PI*.6);turret(-64,-140);
  for(const [x,z] of [[-160,172],[-145,172],[-130,172]]){const m=new T.Mesh(new T.CylinderGeometry(5,5,10,20),MAT.wallC);m.position.set(x,5,z);m.castShadow=m.receiveShadow=true;scene.add(m);W.meshes.push(m);
    const b={minX:x-4.4,maxX:x+4.4,minZ:z-4.4,maxZ:z+4.4,minY:0,maxY:10,solid:true,shoot:true};W.boxes.push(b);gridAdd(b)}
  gasZone(-115,160,8);for(let i=0;i<6;i++)barrel(srnd(-160,-100),srnd(140,155),true);
  powerSwitch(-130,1.3,-110,'x+');
  W.spawnsP=[{x:-175,z:-175},{x:-175,z:175},{x:60,z:-178},{x:60,z:178}];
  for(const x of [-60,-20,20,60,100])for(const z of [-90,90])lamp(x+4.5,z+4.5);
  extractPoint('std',-182,0,'西門');extractPoint('std',90,-182,'南側卸貨區');extractPoint('std',-110,182,'油庫後門');extractPoint('nobag',165,40,'救生艇');
  extractPoint('paid',-20,182,'走私貨車');extractPoint('power',90,182,'北側電閘');extractPoint('heli',-15,-30,'港務直升機坪');
  W.powerGate=dbox(90,188,10,1,5,'metal',0);
  scatter(140);W.bossSpot={x:sx,z:-12,y:6};
  W.flagsPos=[[sx,0,'A'],[-145,0,'B'],[20,0,'C'],[-75,-130,'D'],[40,130,'E']];W.basePos={1:{x:-175,z:150},2:{x:80,z:-170}};W.relicPos={x:20,z:0};W.holdPos={x:-145,z:0};W.duelSpots=[{x:-25,z:-40},{x:-25,z:40}]}

/* ================= MAP: 寒脊研究站 (350 m) ================= */
function genFrost(){const h=W.half;
  for(const z of [-88,88]){for(let x=-h+10;x<h-10;x+=9){if(Math.abs(x-(z>0?-38:50))<16||Math.abs(x-(z>0?100:-112))<12)continue;rock(x,z+srnd(-3,3),srnd(8,11),srnd(5,9),srnd(4,9))}
    padTo(z>0?-38:50,z+(z>0?-14:14),z>0?-38:50,z+(z>0?16:-16),0)}
  for(let i=0;i<50;i++)rock(srnd(-h+10,h-10),srnd(-h+10,h-10),srnd(3,8),srnd(3,8),srnd(1.5,5));
  road(0,0,74,6);road(0,0,6,74);
  building(-17,-17,20,14,{floors:2,doors:['s','e'],loot:3,lootTypes:['pc','pc','safe','crate'],mat:'wallB'});
  const lab=building(17,-17,18,13,{floors:1,h:5,doors:['s','w'],locked:'R',vault:true,loot:2,lootTypes:['vault','safe'],mat:'wallA',mine:true});gasZone(17,-17,6);
  building(-17,17,18,13,{floors:1,h:4.5,doors:['n','e'],loot:2,lootTypes:['med','med','crate'],mat:'wallC'});
  building(17,17,20,14,{floors:2,doors:['n','w'],loot:2,lootTypes:['pc','weapon','crate'],mat:'wallB',ladder:true});
  for(const [x,z] of [[0,-30],[0,30],[-31,0],[31,0]])sandbag(x,z,6,x!==0);
  turret(-4,-4);turret(4,4);camDevice(-27.2,3,-10,Math.PI*1.5);camDevice(27.2,3,10,Math.PI*.5);W.bossSpot={x:-17,z:-12};ammoStation(-6,-6);ammoStation(6,6);
  powerSwitch(-7.6,1.3,17,'x+');
  {const x=56,z=-44;sbox(x,z,8,8,4,'wallA',0);const dm=new T.Mesh(new T.SphereGeometry(5,20,14,0,TAU,0,Math.PI/2),MAT.wallC);dm.position.set(x,4,z);dm.castShadow=true;scene.add(dm);W.meshes.push(dm);sbox(x,z,7,7,4,null,4);lootBox(x+5,z,'pc');W.enemySpots.push({x:x+6,z})}
  {const x=-75,z=50;for(const [dx,dz] of [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]])sbox(x+dx,z+dz,.3,.3,14,'metal',0,{uv:1});sbox(x,z,4,4,.3,'metal',14);elevator(x,z-3.4,2.2,2.2,0,14);sbox(x,z-2.2,2.2,.2,.3,'metal',14);
    W.roofSpots.push({x,z,y:14.3,roof:true,tower:true});zipline(x+1,14.3,z+1,x+50,0,z+30);searchlight(x+2.2,15,z,Math.PI*.5)}
  for(const [x,z] of [[100,-125],[-112,-125],[118,125],[-125,118]]){sbox(x,z,10,8,2.6,'dark',0);for(const s of [-1,1])sbox(x,z+s*4.2,10,.4,2.2,'dark',0);sbox(x+5.2,z,.4,8.8,2.2,'dark',0);
    lootBox(x-2,z,'weapon');lootBox(x+2,z+2,'crate');W.enemySpots.push({x,z});searchlight(x-5.2,3,z,x>0?-Math.PI/2:Math.PI/2)}
  for(let i=0;i<10;i++){const x=srnd(-150,-62),z=srnd(-62,62);if(isFree(x,z,8))building(x,z,srnd(8,11),srnd(7,9),{h:3.6,mat:'wood',loot:1,lootTypes:['crate','med','pc']})}
  for(let i=0;i<8;i++){const x=srnd(62,150),z=srnd(-70,70);if(isFree(x,z,8))building(x,z,srnd(9,14),srnd(8,11),{h:4,floors:SR()<.3?2:1,loot:1})}
  for(let i=0;i<8;i++){const x=srnd(-140,140),z=srnd(105,158);if(isFree(x,z,8))building(x,z,srnd(9,13),srnd(8,10),{h:4,loot:1})}
  for(let i=0;i<8;i++){const x=srnd(-140,140),z=srnd(-158,-105);if(isFree(x,z,8))building(x,z,srnd(9,13),srnd(8,10),{h:4,loot:1,ladder:SR()<.4})}
  for(const [x,z] of [[-125,0],[125,-6]]){tower(x,z);zipline(x,5.25,z,x*.75,0,z+20)}
  forest(170,-h+12,-h+12,h-12,h-12,1.1);
  W.spawnsP=[{x:-158,z:-158},{x:158,z:-158},{x:158,z:158},{x:-158,z:158}];
  for(const c of [-25,25])for(const c2 of [-25,25])lamp(c+3.5,c2+3.5);
  extractPoint('std',-165,-12,'西側纜車站');extractPoint('std',165,12,'東側雪道');extractPoint('nobag',-38,165,'冰縫小徑');
  extractPoint('paid',50,-165,'補給車隊');extractPoint('power',0,-165,'南側隧道');extractPoint('heli',75,75,'研究站直升機坪');
  W.powerGate=dbox(0,-171,10,1,5,'metal',0);
  scatter(90);
  W.flagsPos=[[0,0,'A'],[-75,50,'B'],[56,-44,'C'],[-112,-125,'D'],[118,125,'E']];W.basePos={1:{x:-158,z:0},2:{x:158,z:0}};W.relicPos={x:0,z:0};W.holdPos={x:-17,z:17};W.duelSpots=[{x:-40,z:-55},{x:40,z:-55}]}

/* ================= MAP: 斷河水壩 (360 m) ================= */
function genDam(){const h=W.half;const RW=22;const bridges=[-110,-20,70];
  const river=new T.Mesh(new T.PlaneGeometry(RW*2,h*2),new T.MeshStandardMaterial({color:0x2d5566,roughness:.15,metalness:.4,transparent:true,opacity:.95}));river.rotation.x=-Math.PI/2;river.position.set(0,.04,0);scene.add(river);W.meshes.push(river);
  for(const s of [-1,1])sbox(s*(RW+.6),0,1.2,h*2,.5,'rock',0,{uv:2});
  const onBridge=z=>bridges.some(b=>Math.abs(z-b)<4)||(z>146&&z<166);
  W.clampExtra=p=>{if(Math.abs(p.x)<RW&&!onBridge(p.z)){p.x=p.x<0?-RW:RW}};
  W.navBlock=(x,z)=>Math.abs(x)<RW+.5&&!onBridge(z);
  for(const bz of bridges){sbox(0,bz,RW*2+6,8,.4,'dark',0,{uv:3});for(const s of [-1,1])sbox(0,bz+s*4.1,RW*2+6,.25,1.1,'metal',.4,{uv:2});for(const s of [-1,1])sbox(s*(RW*.5),bz,1.4,9,.4,null,-3);
    W.enemySpots.push({x:-RW-8,z:bz},{x:RW+8,z:bz})}
  // dam
  const dz=156,DH=16;sbox(0,dz,130,18,DH,'wallC',0,{uv:4});sbox(0,dz-9.2,130,.4,1.1,'metal',DH);sbox(0,dz+9.2,130,.4,1.1,'metal',DH);
  stairs(-85.2,dz,'x+',3,DH,'wallC');elevator(67,dz,3,3,0,DH-.3);sbox(66.5,dz,.6,4,DH,null,0,{solid:false});
  for(const x of [-40,0,40])searchlight(x,DH+1.2,dz-9.6,Math.PI);
  W.roofSpots.push({x:-30,z:dz,y:DH,roof:true},{x:30,z:dz,y:DH,roof:true});zipline(20,DH,dz-6,60,0,dz-60);zipline(-20,DH,dz-6,-60,0,dz-60);
  // power station & turbine hall
  building(45,118,26,18,{floors:2,doors:['s','w','e'],loot:3,lootTypes:['pc','safe','crate','weapon'],mat:'dark'});
  building(-48,118,30,18,{h:9,floors:1,doors:['s','e','w'],loot:3,lootTypes:['crate','weapon','safe'],mat:'wallB',ladder:true});
  for(let i=0;i<3;i++){const x=-58+i*10;const m=new T.Mesh(new T.CylinderGeometry(2.2,2.2,4,16),MAT.metal);m.rotation.z=Math.PI/2;m.position.set(x,2.2,118);scene.add(m);W.meshes.push(m);sbox(x,118,4,4.4,4.4,null,0)}
  turret(30,104);turret(-30,104);camDevice(32.6,3,109.2,Math.PI);powerSwitch(45,1.3,108.8,'z-');gasZone(85,120,9);ammoStation(0,135);ammoStation(30,100);W.bossSpot={x:45,z:118};
  // villages
  for(let i=0;i<14;i++){const x=srnd(-165,-45),z=srnd(-165,95);if(isFree(x,z,9))building(x,z,srnd(9,15),srnd(8,13),{floors:SR()<.3?2:1,ladder:SR()<.3,mine:SR()<.08})}
  for(let i=0;i<14;i++){const x=srnd(45,165),z=srnd(-165,95);if(isFree(x,z,9))building(x,z,srnd(9,15),srnd(8,13),{floors:SR()<.3?2:1,ladder:SR()<.3})}
  building(-100,-150,16,12,{h:5,locked:'B',vault:true,loot:2,lootTypes:['safe','vault'],mat:'wallB',mine:true});
  for(const [x,z] of [[-RW-6,-60],[RW+6,25]]){tower(x,z);zipline(x,5.25,z,-x*1.8,0,z+12)}
  padTo(-RW-5,-70,RW+8,-70,0);padTo(RW+5,-60,-RW-8,-60,0);padTo(RW+5,110,RW+20,100,0);
  for(let i=0;i<5;i++)yard(srnd(-150,-60)*(i%2?1:-1)*-1,srnd(-140,60));
  forest(220,-h+12,-h+12,h-12,h-12,1.15);
  W.spawnsP=[{x:-165,z:-165},{x:165,z:-165},{x:165,z:30},{x:-165,z:30}];
  for(const bz of bridges)for(const s of [-1,1])lamp(s*(RW+4),bz+5);
  extractPoint('std',-170,-60,'西側伐木道');extractPoint('std',170,-60,'東側公路');extractPoint('std',0,-172,'下游浮橋');
  extractPoint('paid',-120,170,'山區走私小路');extractPoint('power',120,172,'水壩維修隧道');extractPoint('heli',100,60,'直升機坪');extractPoint('nobag',-RW-8,-165,'河岸排水口');
  W.powerGate=dbox(120,178,10,1,5,'metal',0);
  scatter(120);
  W.flagsPos=[[0,-20,'A'],[45,118,'B'],[-48,118,'C'],[-100,-100,'D'],[100,-100,'E']];W.basePos={1:{x:-160,z:-40},2:{x:160,z:-40}};W.relicPos={x:0,z:-20};W.holdPos={x:45,z:118};W.duelSpots=[{x:0,z:-110-0},{x:0,z:70}];
  W.duelSpots=[{x:-14,z:-20},{x:14,z:-20}]}

/* ================= MAP: 沙暴倉庫 (124 m) ================= */
function genWarehouse(){const h=W.half;
  const WW=58,WD=36,WH=8;const t=.4;
  const big=(axis,fixed,a,b,openings)=>wallRun(axis,fixed,a,b,0,WH,'wallB',openings.map(c=>({c,w:6,b:0,t:4.6})),t);
  big('x',-WD/2,-WW/2-.2,WW/2+.2,[-14,14]);big('x',WD/2,-WW/2-.2,WW/2+.2,[-14,14]);big('z',-WW/2,-WD/2+.2,WD/2-.2,[0]);big('z',WW/2,-WD/2+.2,WD/2-.2,[0]);
  sbox(0,0,WW+.8,WD+.8,.35,'roof',WH);sbox(0,0,WW-.2,WD-.2,.04,'floor',0,{solid:false,shoot:false});
  // catwalks
  for(const s of [-1,1]){sbox(0,s*(WD/2-1.7),WW-12,3,.3,'metal',4.2);sbox(0,s*(WD/2-3.25),WW-12,.12,1.1,'metal',4.5);stairs(-WW/2+2,s*(WD/2-1.7),'x+',2.6,4.5,'metal');W.roofSpots.push({x:10,z:s*(WD/2-1.7),y:4.5,indoor:true})}
  zipline(WW/2-7,4.5,-(WD/2-1.7),0,0,-3);
  // interior cover
  for(const x of [-16,-6,6,16])container(x,0,true,0,spick(['cR','cB','cG']));for(const [x,z] of [[-11,-9],[11,9],[-11,9],[11,-9]])container(x,z,false,0);
  for(let i=0;i<6;i++){const x=srnd(-24,24),z=srnd(-14,14);if(isFree(x,z,1))woodCrate(x,z)}
  for(let i=0;i<6;i++){const x=srnd(-24,24),z=srnd(-14,14);if(isFree(x,z,1))lootBox(x,z,spick(['crate','weapon','safe','pc']))}
  ammoStation(-26,-14);ammoStation(26,14);
  // yard
  for(let i=0;i<20;i++){const x=srnd(-h+6,h-6),z=srnd(-h+6,h-6);if(Math.abs(x)<WW/2+4&&Math.abs(z)<WD/2+4)continue;const r=SR();
    if(r<.4){if(isFree(x,z,4))container(x,z,SR()<.5,0);if(SR()<.4&&isFree(x,z,4,2.6))container(x,z,SR()<.5,2.6)}else if(r<.7){if(isFree(x,z,1.6))woodCrate(x,z)}else if(r<.85)sandbag(x,z,4,SR()<.5);else barrel(x,z,true)}
  for(const s of [-1,1]){padTo(s*(WW/2+3.5),-10,s*(WW/2-6),-10,WH+.35);ladder(s*20,s*(WD/2+.2),s>0?'z+':'z-',WH+.35)}
  elevator(0,-WD/2-2,3,2.6,0,WH+.05);
  for(const [x,z] of [[-50,-50],[50,50]])tower(x,z);
  lamp(-30,-24);lamp(30,24);lamp(-30,24);lamp(30,-24);
  W.spawnsP=[{x:-55,z:-55},{x:55,z:-55},{x:55,z:55},{x:-55,z:55}];
  extractPoint('std',-56,0,'西門');extractPoint('std',56,0,'東門');extractPoint('paid',0,56,'貨車');extractPoint('heli',0,-50,'屋外停機坪');extractPoint('nobag',40,-56,'圍牆破洞');
  W.bossSpot={x:0,z:5};scatter(10,6);
  W.flagsPos=[[0,0,'A'],[-40,-40,'B'],[40,40,'C'],[40,-40,'D'],[-40,40,'E']];W.basePos={1:{x:-52,z:0},2:{x:52,z:0}};W.relicPos={x:0,z:0};W.holdPos={x:0,z:0};W.duelSpots=[{x:-24,z:0},{x:24,z:0}]}
