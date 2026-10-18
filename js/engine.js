'use strict';
/* ================= helpers ================= */
const T=THREE,$=id=>document.getElementById(id);
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0];
function mulberry(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let SR=mulberry(1);const srnd=(a,b)=>a+SR()*(b-a),spick=a=>a[SR()*a.length|0];
const isTouch=(('ontouchstart' in window)||navigator.maxTouchPoints>0)&&matchMedia('(pointer:coarse)').matches;
const angDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

/* ================= renderer ================= */
const view=$('view');
const renderer=new T.WebGLRenderer({antialias:!isTouch,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(isTouch?1.2:1.5,window.devicePixelRatio||1));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.autoClear=false;view.appendChild(renderer.domElement);
const canvas=renderer.domElement;
const scene=new T.Scene();scene.background=new T.Color(0xb3a083);scene.fog=new T.Fog(0xb3a083,30,200);
const camera=new T.PerspectiveCamera(78,1,.05,700);camera.rotation.order='YXZ';scene.add(camera);
const vmScene=new T.Scene(),vmCam=new T.PerspectiveCamera(55,1,.01,5);
vmScene.add(new T.HemisphereLight(0xfff1dc,0x3a3024,1.0));{const l=new T.DirectionalLight(0xffe0b0,1.1);l.position.set(.6,1,.4);vmScene.add(l)}
function resize(){const w=view.clientWidth||innerWidth,h=view.clientHeight||innerHeight;renderer.setSize(w,h);camera.aspect=vmCam.aspect=w/h;camera.updateProjectionMatrix();vmCam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
const hemi=new T.HemisphereLight(0xe6d6b8,0x4a3d2e,.78);scene.add(hemi);
const sun=new T.DirectionalLight(0xffd6a3,1.75);sun.castShadow=true;const SHS=isTouch?1024:2048;sun.shadow.mapSize.set(SHS,SHS);
{const c=sun.shadow.camera;c.left=-70;c.right=70;c.top=70;c.bottom=-70;c.near=1;c.far=400}
sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
const sunDir=new T.Vector3(70,95,40).normalize();
const flashLight=new T.PointLight(0xffc070,0,10,2);scene.add(flashLight);let flashI=0;
const torch=new T.SpotLight(0xfff0d0,0,60,.36,.5,1.2);torch.position.set(.2,-.15,0);camera.add(torch);camera.add(torch.target);torch.target.position.set(0,-.4,-10);
const lampLights=[];for(let i=0;i<4;i++){const l=new T.PointLight(0xffb060,0,28,1.6);l.position.set(0,-50,0);scene.add(l);lampLights.push(l)}
function updateShadowCam(){const p=camera.position,s=140/SHS;const cx=Math.round(p.x/s)*s,cz=Math.round(p.z/s)*s;sun.target.position.set(cx,0,cz);sun.position.set(cx+sunDir.x*150,sunDir.y*150,cz+sunDir.z*150)}

/* ================= textures / themes ================= */
const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
function tex(base,o={}){
  const s=o.size||256,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
  g.fillStyle=base;g.fillRect(0,0,s,s);
  const n=o.n||2200;for(let i=0;i<n;i++){const a=Math.random()*(o.k||.22);g.fillStyle=Math.random()<.55?`rgba(0,0,0,${a})`:`rgba(255,250,235,${a*.55})`;const z=Math.random()*(o.sz||3)+1;g.fillRect(Math.random()*s,Math.random()*s,z,z)}
  const ns=o.stains===undefined?7:o.stains;
  for(let i=0;i<ns;i++){const x=Math.random()*s,y=Math.random()*s,r=rnd(18,70);const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(35,25,15,.2)');gr.addColorStop(1,'rgba(35,25,15,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  if(o.ribs){const st=s/o.ribs;for(let x=0;x<s;x+=st){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x,0,st*.22,s);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x+st*.5,0,2,s)}}
  if(o.rows){const st=s/o.rows;g.fillStyle='rgba(0,0,0,.22)';for(let y=0;y<s;y+=st)g.fillRect(0,y,s,2);if(o.bricks){for(let r=0;r<o.rows;r++){const off=(r%2)*st;for(let x=off;x<s;x+=st*2)g.fillRect(x,r*st,2,st)}}}
  if(o.planks){const st=s/o.planks;g.fillStyle='rgba(0,0,0,.35)';for(let y=0;y<s;y+=st)g.fillRect(0,y,s,3)}
  if(o.grid){const st=s/o.grid;g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;for(let x=0;x<=s;x+=st){g.beginPath();g.moveTo(x,0);g.lineTo(x,s);g.stroke();g.beginPath();g.moveTo(0,x);g.lineTo(s,x);g.stroke()}}
  if(o.hazard){g.fillStyle='rgba(240,200,60,.85)';g.fillRect(0,s*.42,s,s*.16)}
  if(o.snow){for(let i=0;i<o.snow;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.5})`;g.fillRect(Math.random()*s,Math.random()*s*.25,rnd(4,20),rnd(2,5))}}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.sRGBEncoding;t.anisotropy=maxAniso;return t}
const THEMES={
  town:{ground:'#7b6b53',road:'#4c4841',wallA:'#9b9383',wallB:'#8a8578',wallC:'#a39a86',dark:'#625e55',roof:'#55524b',wood:'#7d5c35',sand:'#8a7a58',rock:'#7a6e60',metal:'#4a4a46',floor:'#6a6258',
    sky:{day:0xb3a083,dusk:0xb87452,night:0x0a0f1c},mtn:0x8a7a62},
  harbor:{ground:'#5d5b55',road:'#3e3d3a',wallA:'#8a8c88',wallB:'#7a7f86',wallC:'#9a948a',dark:'#4b4f53',roof:'#3f4246',wood:'#7d5c35',sand:'#7f7a68',rock:'#5f6064',metal:'#3c4248',floor:'#55585a',
    sky:{day:0x9fb0b8,dusk:0xb07a62,night:0x0a101c},mtn:0x6a7680,water:0x2c4a5a},
  frost:{ground:'#d9dde2',road:'#9aa2aa',wallA:'#a8a8a2',wallB:'#8f979c',wallC:'#b5b0a4',dark:'#5a6064',roof:'#4c5257',wood:'#6d5134',sand:'#b9b9b0',rock:'#6f737a',metal:'#454b52',floor:'#7c8084',snowy:true,
    sky:{day:0xc5d2de,dusk:0xc89a8a,night:0x0b1220},mtn:0xb8c4d0},
};
const MAT={};let THEME=THEMES.town;
function buildMaterials(themeId){
  for(const k in MAT){const m=MAT[k];if(m.map)m.map.dispose();m.dispose();delete MAT[k]}
  const th=THEME=THEMES[themeId];const sn=th.snowy?30:0;
  const mk=(map,o={})=>new T.MeshStandardMaterial(Object.assign({map,roughness:.92,metalness:0},o));
  MAT.ground=mk(tex(th.ground,{size:512,n:16000,k:th.snowy?.08:.25,stains:th.snowy?6:34,sz:4}),{roughness:1});
  MAT.road=mk(tex(th.road,{n:5000,k:.2,stains:10}),{roughness:.95});
  MAT.wallA=mk(tex(th.wallA,{rows:4,snow:sn}));MAT.wallB=mk(tex(th.wallB,{rows:6,bricks:1,snow:sn}));MAT.wallC=mk(tex(th.wallC,{rows:3,snow:sn}));
  MAT.dark=mk(tex(th.dark,{rows:2}));MAT.roof=mk(tex(th.roof,{stains:12,snow:sn*3}));MAT.floor=mk(tex(th.floor,{grid:4,n:1200}));
  MAT.wood=mk(tex(th.wood,{planks:4,stains:3}));MAT.sand=mk(tex(th.sand,{rows:3,k:.3}));MAT.rock=mk(tex(th.rock,{n:5000,k:.35,sz:5,snow:sn*2}),{roughness:1,flatShading:true});
  MAT.metal=mk(tex(th.metal,{ribs:6}),{roughness:.6,metalness:.4});
  MAT.cR=mk(tex('#7a3624',{ribs:10,stains:10}),{roughness:.7,metalness:.25});MAT.cB=mk(tex('#2b4860',{ribs:10,stains:10}),{roughness:.7,metalness:.25});
  MAT.cG=mk(tex('#4a5536',{ribs:10,stains:10}),{roughness:.7,metalness:.25});MAT.cT=mk(tex('#9a7f52',{ribs:10,stains:10}),{roughness:.7,metalness:.25});
  MAT.cW=mk(tex('#c9c4b8',{ribs:10,stains:10}),{roughness:.7,metalness:.25});
  MAT.barrel=mk(tex('#8c2a1c',{ribs:3,hazard:1}),{roughness:.6,metalness:.3});MAT.drum=mk(tex('#3f4a3a',{ribs:3}),{roughness:.6,metalness:.3});
  MAT.loot=mk(tex('#2e3529',{n:800}),{roughness:.6,metalness:.3});MAT.gold=mk(tex('#9a7f42',{n:800}),{roughness:.4,metalness:.6});
  MAT.hull=mk(tex('#3a3f46',{rows:8,stains:16}),{roughness:.7,metalness:.3});MAT.yellow=mk(tex('#c29a2a',{ribs:4}),{roughness:.6,metalness:.3});
  MAT.mtn=new T.MeshStandardMaterial({color:th.mtn,roughness:1,flatShading:true});
}

/* ================= world container ================= */
let W=null;
const G={cs:8,n:0,ox:0,cells:[],stamp:1};
function gridInit(half){G.ox=-half-16;G.n=Math.ceil((half*2+32)/G.cs);G.cells=new Array(G.n*G.n);for(let i=0;i<G.cells.length;i++)G.cells[i]=[]}
function gridAdd(b){const x0=Math.max(0,Math.floor((b.minX-G.ox)/G.cs)),x1=Math.min(G.n-1,Math.floor((b.maxX-G.ox)/G.cs)),z0=Math.max(0,Math.floor((b.minZ-G.ox)/G.cs)),z1=Math.min(G.n-1,Math.floor((b.maxZ-G.ox)/G.cs));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)G.cells[z*G.n+x].push(b)}
const QB=[];
function gridQuery(minX,minZ,maxX,maxZ){QB.length=0;const st=++G.stamp;const x0=Math.max(0,Math.floor((minX-G.ox)/G.cs)),x1=Math.min(G.n-1,Math.floor((maxX-G.ox)/G.cs)),z0=Math.max(0,Math.floor((minZ-G.ox)/G.cs)),z1=Math.min(G.n-1,Math.floor((maxZ-G.ox)/G.cs));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const c=G.cells[z*G.n+x];for(let i=0;i<c.length;i++){const b=c[i];if(b._s!==st){b._s=st;QB.push(b)}}}return QB}

// merged static geometry buckets
const buckets={};
function bucket(matKey){return buckets[matKey]||(buckets[matKey]={p:[],n:[],uv:[],i:[]})}
const _F=[ // a corner selector, u axis, v axis, normal
  [[1,0,1],[0,0,-1],[0,1,0],[1,0,0]],[[0,0,0],[0,0,1],[0,1,0],[-1,0,0]],
  [[0,1,1],[1,0,0],[0,0,-1],[0,1,0]],[[0,0,0],[1,0,0],[0,0,1],[0,-1,0]],
  [[0,0,1],[1,0,0],[0,1,0],[0,0,1]],[[1,0,0],[-1,0,0],[0,1,0],[0,0,-1]]];
function pushBox(B,x0,y0,z0,x1,y1,z1,s=2,skipBottom=true,col=null){
  const L=[x1-x0,y1-y0,z1-z0],mn=[x0,y0,z0];
  for(let f=0;f<6;f++){if(f===3&&skipBottom&&y0<=.001)continue;const F=_F[f];
    const a=[mn[0]+F[0][0]*L[0],mn[1]+F[0][1]*L[1],mn[2]+F[0][2]*L[2]];
    const u=[F[1][0]*L[0],F[1][1]*L[1],F[1][2]*L[2]],v=[F[2][0]*L[0],F[2][1]*L[1],F[2][2]*L[2]];
    const uh=F[1],vh=F[2];const base=B.p.length/3;
    const vs=[a,[a[0]+u[0],a[1]+u[1],a[2]+u[2]],[a[0]+u[0]+v[0],a[1]+u[1]+v[1],a[2]+u[2]+v[2]],[a[0]+v[0],a[1]+v[1],a[2]+v[2]]];
    for(const q of vs){B.p.push(q[0],q[1],q[2]);B.n.push(F[3][0],F[3][1],F[3][2]);B.uv.push((q[0]*uh[0]+q[1]*uh[1]+q[2]*uh[2])/s,(q[0]*vh[0]+q[1]*vh[1]+q[2]*vh[2])/s);if(col&&B.c)B.c.push(col[0],col[1],col[2])}
    B.i.push(base,base+1,base+2,base,base+2,base+3)}}
function bucketsToMeshes(){
  for(const k in buckets){const B=buckets[k];if(!B.p.length)continue;const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(B.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(B.uv,2));
    g.setIndex(B.p.length/3>65535?new T.Uint32BufferAttribute(B.i,1):new T.Uint16BufferAttribute(B.i,1));g.computeBoundingSphere();
    const m=new T.Mesh(g,MAT[k]);m.castShadow=m.receiveShadow=true;scene.add(m);W.meshes.push(m);delete buckets[k]}}
// static box: collision + shooting + render
function sbox(x,z,w,d,h,mat,y0=0,o={}){
  const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y0,maxY:y0+h,solid:o.solid!==false,shoot:o.shoot!==false,kind:o.kind||'w'};
  if(mat)pushBox(bucket(mat),b.minX,b.minY,b.minZ,b.maxX,b.maxY,b.maxZ,o.uv||2);
  if(b.solid||b.shoot){W.boxes.push(b);gridAdd(b)}return b}
// dynamic box (own mesh)
function dbox(x,z,w,d,h,mat,y0=0,o={}){
  const geo=new T.BoxGeometry(w,h,d);const m=new T.Mesh(geo,typeof mat==='string'?MAT[mat]:mat);m.position.set(x,y0+h/2,z);m.castShadow=o.cast!==false;m.receiveShadow=true;scene.add(m);W.meshes.push(m);
  const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y0,maxY:y0+h,solid:o.solid!==false,shoot:o.shoot!==false,kind:o.kind||'d',mesh:m};
  W.boxes.push(b);gridAdd(b);m.userData.box=b;return b}

/* ================= collision ================= */
function blocks(b,x,z,r,feet,head){return !b.off&&b.solid&&b.maxY>feet+.45&&b.minY<head&&x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ}
function moveCircle(p,dx,dz,r,feet,head){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/(r*.8)));dx/=n;dz/=n;const H=W?W.half-1:999;
  for(let s=0;s<n;s++){
    p.x+=dx;let q=gridQuery(p.x-r-.1,p.z-r-.1,p.x+r+.1,p.z+r+.1);for(const b of q)if(blocks(b,p.x,p.z,r,feet,head)){if(dx>0)p.x=b.minX-r-.001;else if(dx<0)p.x=b.maxX+r+.001}
    p.z+=dz;q=gridQuery(p.x-r-.1,p.z-r-.1,p.x+r+.1,p.z+r+.1);for(const b of q)if(blocks(b,p.x,p.z,r,feet,head)){if(dz>0)p.z=b.minZ-r-.001;else if(dz<0)p.z=b.maxZ+r+.001}
  }
  p.x=clamp(p.x,-H,H);p.z=clamp(p.z,-H,H)}
function groundAt(x,z,r,feet){let g=0;const q=gridQuery(x-r,z-r,x+r,z+r);for(const b of q){if(!b.off&&b.solid&&b.maxY<=feet+.45&&b.maxY>g&&x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)g=b.maxY}return g}
function ceilingHit(x,z,r,feet,head){const q=gridQuery(x-r,z-r,x+r,z+r);for(const b of q)if(!b.off&&b.solid&&b.minY>feet+.45&&b.minY<head&&x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)return true;return false}
function isFree(x,z,r,y=0){if(Math.abs(x)>W.half-3||Math.abs(z)>W.half-3)return false;const q=gridQuery(x-r,z-r,x+r,z+r);for(const b of q)if(!b.off&&b.solid&&b.minY<y+1.9&&b.maxY>y+.05&&x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)return false;return true}

/* ================= raycasting ================= */
const _o=[0,0,0],_d=[0,0,0];
function slab(b,maxT){let t0=0,t1=maxT,ax=-1,sg=0;const mn=[b.minX,b.minY,b.minZ],mx=[b.maxX,b.maxY,b.maxZ];
  for(let k=0;k<3;k++){const oo=_o[k],dd=_d[k];if(Math.abs(dd)<1e-9){if(oo<mn[k]||oo>mx[k])return -1;continue}
    let ta=(mn[k]-oo)/dd,tb=(mx[k]-oo)/dd,s=-1;if(ta>tb){const t=ta;ta=tb;tb=t;s=1}
    if(ta>t0){t0=ta;ax=k;sg=s}if(tb<t1)t1=tb;if(t0>t1)return -1}
  if(ax<0)return -1;_hitAx=ax;_hitSg=sg;return t0}
let _hitAx=0,_hitSg=0;
const RH={t:0,box:null,nx:0,ny:0,nz:0,ground:false};
// returns true on hit, details in RH
function rayWorld(o,d,maxT,filter){
  _o[0]=o.x;_o[1]=o.y;_o[2]=o.z;_d[0]=d.x;_d[1]=d.y;_d[2]=d.z;
  let best=maxT,hit=false;
  if(d.y<-1e-6){const t=-o.y/d.y;if(t>0&&t<best){best=t;hit=true;RH.box=null;RH.ground=true;RH.nx=0;RH.ny=1;RH.nz=0}}
  const cs=G.cs;let cx=Math.floor((o.x-G.ox)/cs),cz=Math.floor((o.z-G.ox)/cs);
  const sx=d.x>0?1:-1,sz=d.z>0?1:-1;
  const tdx=Math.abs(d.x)<1e-9?Infinity:cs/Math.abs(d.x),tdz=Math.abs(d.z)<1e-9?Infinity:cs/Math.abs(d.z);
  let tmx=Math.abs(d.x)<1e-9?Infinity:((G.ox+(cx+(sx>0?1:0))*cs)-o.x)/d.x,tmz=Math.abs(d.z)<1e-9?Infinity:((G.ox+(cz+(sz>0?1:0))*cs)-o.z)/d.z;
  let tc=0;const st=++G.stamp;let it=0;
  while(tc<=best&&it++<300){
    if(cx>=0&&cx<G.n&&cz>=0&&cz<G.n){const c=G.cells[cz*G.n+cx];for(let i=0;i<c.length;i++){const b=c[i];if(b._s===st)continue;b._s=st;if(b.off||!b.shoot)continue;if(filter&&!filter(b))continue;
      const t=slab(b,best);if(t>=0&&t<best){best=t;hit=true;RH.box=b;RH.ground=false;RH.nx=_hitAx===0?_hitSg:0;RH.ny=_hitAx===1?_hitSg:0;RH.nz=_hitAx===2?_hitSg:0}}}
    else if((cx<0&&sx<0)||(cx>=G.n&&sx>0)||(cz<0&&sz<0)||(cz>=G.n&&sz>0))break;
    if(tmx<tmz){tc=tmx;tmx+=tdx;cx+=sx}else{tc=tmz;tmz+=tdz;cz+=sz}}
  RH.t=best;return hit}
const _ld=new T.Vector3();
function smokeBlocks(a,b){if(!W||!W.smokes.length)return false;for(const s of W.smokes){if(s.t<1.2)continue;
  const ab=_ld.subVectors(b,a),L2=ab.lengthSq();let t=((s.x-a.x)*ab.x+(s.y-a.y)*ab.y+(s.z-a.z)*ab.z)/L2;t=clamp(t,0,1);
  const px=a.x+ab.x*t-s.x,py=a.y+ab.y*t-s.y,pz=a.z+ab.z*t-s.z;if(px*px+py*py+pz*pz<s.r*s.r*.8)return true}return false}
function los(a,b){const d=_ld.subVectors(b,a);const L=d.length();if(L<.01)return true;d.multiplyScalar(1/L);const dd=d.clone();if(rayWorld(a,dd,L-.3))return false;return !smokeBlocks(a,b)}

/* ================= FX ================= */
const fxGroup=new T.Group();scene.add(fxGroup);
const flashTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,250,220,1)');gr.addColorStop(.25,'rgba(255,200,90,.9)');gr.addColorStop(1,'rgba(255,120,20,0)');g.fillStyle=gr;
  g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,R=i%2?22:64;g.lineTo(64+Math.cos(a)*R,64+Math.sin(a)*R)}g.closePath();g.fill();return new T.CanvasTexture(c)})();
const softTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();
// instanced particles
const PN=500,pMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xffffff}),PN);pMesh.frustumCulled=false;fxGroup.add(pMesh);
const PCOL={spark:new T.Color(0xffd27a),blood:new T.Color(0x7a0f0a),dust:new T.Color(0x8d7f69),fire:new T.Color(0xff8a2a),green:new T.Color(0x72f5a8),snow:new T.Color(0xeef4ff),red:new T.Color(0xff3020),white:new T.Color(0xffffff)};
const parts=[];for(let i=0;i<PN;i++){parts.push({x:0,y:-99,z:0,vx:0,vy:0,vz:0,life:0,max:1,s:0,g:0});pMesh.setColorAt(i,PCOL.spark)}
const _m4=new T.Matrix4(),_q=new T.Quaternion(),_v=new T.Vector3(),_s=new T.Vector3();
let pIdx=0;
function emit(pos,n,col,speed,life,size,grav=9.8,dir=null,spread=1){for(let i=0;i<n;i++){const j=pIdx=(pIdx+1)%PN,p=parts[j];
  let vx=rnd(-1,1)*spread,vy=rnd(-1,1)*spread,vz=rnd(-1,1)*spread;if(dir){vx+=dir.x;vy+=dir.y;vz+=dir.z}const l=Math.hypot(vx,vy,vz)||1,sp=speed*rnd(.4,1);
  p.x=pos.x;p.y=pos.y;p.z=pos.z;p.vx=vx/l*sp;p.vy=vy/l*sp;p.vz=vz/l*sp;p.life=p.max=life*rnd(.6,1);p.s=size*rnd(.6,1.3);p.g=grav;pMesh.setColorAt(j,PCOL[col]||PCOL.spark)}
  pMesh.instanceColor.needsUpdate=true}
// tracers (instanced, additive)
const TRN=80,trMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}),TRN);trMesh.frustumCulled=false;fxGroup.add(trMesh);
const trs=[];for(let i=0;i<TRN;i++){trs.push({life:0,a:new T.Vector3(),b:new T.Vector3(),w:.02});trMesh.setColorAt(i,new T.Color(0xffd890))}
let trIdx=0;const _tc=new T.Color();
function tracer(a,b,col=0xffd890,w=.022){const j=trIdx=(trIdx+1)%TRN,t=trs[j];if(a.distanceTo(b)<.5)return;t.a.copy(a);t.b.copy(b);t.w=w;t.life=.07;_tc.setHex(col);trMesh.setColorAt(j,_tc);trMesh.instanceColor.needsUpdate=true}
// decals
const DN_=120,dcMesh=new T.InstancedMesh(new T.PlaneGeometry(.13,.13),new T.MeshBasicMaterial({color:0x14110d,transparent:true,opacity:.85,polygonOffset:true,polygonOffsetFactor:-4,depthWrite:false}),DN_);dcMesh.frustumCulled=false;fxGroup.add(dcMesh);
let dcIdx=0;const _dn=new T.Vector3(),_up=new T.Vector3(0,0,1);
for(let i=0;i<DN_;i++){_m4.makeScale(0,0,0);dcMesh.setMatrixAt(i,_m4)}
function decal(pt,nx,ny,nz){const j=dcIdx=(dcIdx+1)%DN_;_dn.set(nx,ny,nz);_q.setFromUnitVectors(_up,_dn);_v.set(pt.x+nx*.01,pt.y+ny*.01,pt.z+nz*.01);_s.set(1,1,1);_m4.compose(_v,_q,_s);dcMesh.setMatrixAt(j,_m4);dcMesh.instanceMatrix.needsUpdate=true}
// smoke puffs (sprites)
const smokes=[];for(let i=0;i<70;i++){const s=new T.Sprite(new T.SpriteMaterial({map:softTex,color:0x8a8070,transparent:true,opacity:0,depthWrite:false}));s.visible=false;fxGroup.add(s);smokes.push({s,v:new T.Vector3(),life:0,max:1,size:1,peak:.55})}
let smIdx=0;
function puff(pos,n,size,life,col=0x8a8070,peak=.55,spread=.5,up=1){for(let i=0;i<n;i++){const k=smokes[smIdx=(smIdx+1)%smokes.length];k.s.visible=true;k.s.material.color.setHex(col);k.s.position.set(pos.x+rnd(-spread,spread),pos.y+rnd(0,spread),pos.z+rnd(-spread,spread));k.v.set(rnd(-.6,.6),rnd(.4,1.4)*up,rnd(-.6,.6));k.life=k.max=life*rnd(.7,1.2);k.size=size*rnd(.7,1.3);k.peak=peak}}
// world muzzle flashes
const eFlash=[];for(let i=0;i<14;i++){const s=new T.Sprite(new T.SpriteMaterial({map:flashTex,blending:T.AdditiveBlending,depthWrite:false,transparent:true}));s.scale.set(.7,.7,.7);s.visible=false;fxGroup.add(s);eFlash.push({s,life:0})}
let efIdx=0;function worldFlash(pos){const f=eFlash[efIdx=(efIdx+1)%eFlash.length];f.s.position.copy(pos);f.s.material.rotation=Math.random()*TAU;f.s.visible=true;f.life=.05}
// fireballs
const fireballs=[];for(let i=0;i<8;i++){const m=new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));m.visible=false;fxGroup.add(m);fireballs.push({m,life:0,R:1})}
let fbIdx=0;function fireball(pos,R){const f=fireballs[fbIdx=(fbIdx+1)%fireballs.length];f.m.position.copy(pos);f.m.visible=true;f.life=.45;f.R=R;f.m.scale.setScalar(.2);f.m.material.opacity=1}
function lightFlash(pos,I,dist){flashLight.position.copy(pos);flashI=Math.max(flashI,I);flashLight.distance=dist}
function updateFX(dt){
  for(let i=0;i<PN;i++){const p=parts[i];if(p.life<=0){if(p.s){p.s=0;_m4.makeScale(0,0,0);pMesh.setMatrixAt(i,_m4)}continue}
    p.life-=dt;p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<.02){p.y=.02;p.vx*=.4;p.vy*=-.2;p.vz*=.4}
    const s=p.life>0?p.s*(p.life/p.max*.7+.3):0;if(p.life<=0)p.s=0;_m4.makeScale(s,s,s);_m4.setPosition(p.x,p.y,p.z);pMesh.setMatrixAt(i,_m4)}
  pMesh.instanceMatrix.needsUpdate=true;
  for(let i=0;i<TRN;i++){const t=trs[i];if(t.life<=0){if(t.w){t.w=0;_m4.makeScale(0,0,0);trMesh.setMatrixAt(i,_m4)}continue}
    t.life-=dt;const k=Math.max(0,t.life/.07);_v.copy(t.a).lerp(t.b,.5);const L=t.a.distanceTo(t.b);_m4.lookAt(t.a,t.b,camera.up);_q.setFromRotationMatrix(_m4);_s.set(t.w*k,t.w*k,L);_m4.compose(_v,_q,_s);trMesh.setMatrixAt(i,_m4);if(t.life<=0)t.w=0}
  trMesh.instanceMatrix.needsUpdate=true;
  for(const k of smokes){if(k.life<=0)continue;k.life-=dt;if(k.life<=0){k.s.visible=false;continue}k.s.position.addScaledVector(k.v,dt);k.v.multiplyScalar(Math.exp(-dt*.6));const f=1-k.life/k.max;k.s.scale.setScalar(k.size*(.4+f*1.4));k.s.material.opacity=k.peak*Math.sin(Math.min(1,f*4)*Math.PI/2)*(1-f)}
  for(const f of eFlash){if(f.life<=0)continue;f.life-=dt;if(f.life<=0)f.s.visible=false}
  for(const f of fireballs){if(f.life<=0)continue;f.life-=dt;const k=1-f.life/.45;f.m.scale.setScalar(f.R*(.3+k*.9));f.m.material.opacity=Math.max(0,1-k);if(f.life<=0)f.m.visible=false}
  flashI*=Math.exp(-dt*28);flashLight.intensity=flashI<.02?0:flashI;
}

/* ================= audio ================= */
let ac=null,master=null,noiseBuf=null;
function initAudio(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.75;const comp=ac.createDynamicsCompressor();master.connect(comp);comp.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){ac=null}}
  if(ac&&ac.state==='suspended')ac.resume()}
function aout(pan){if(!ac)return null;if(pan&&ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=clamp(pan,-1,1);p.connect(master);return p}return master}
function gunSnd(vol=.5,low=1000,dur=.2,thump=110,pan=0){if(!ac)return;const t=ac.currentTime,o=aout(pan);
  const s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(low*3.5,t);f.frequency.exponentialRampToValueAtTime(low*.35,t+dur);
  const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(o);s.start(t,Math.random()*.6,dur+.05);
  if(thump){const os=ac.createOscillator();os.type='sine';os.frequency.setValueAtTime(thump,t);os.frequency.exponentialRampToValueAtTime(38,t+.12);const og=ac.createGain();og.gain.setValueAtTime(vol*.9,t);og.gain.exponentialRampToValueAtTime(.001,t+.14);os.connect(og);og.connect(o);os.start(t);os.stop(t+.16)}}
function blip(f,d,type='square',v=.05,slide=0,delay=0){if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02)}
function noiseHit(dur,lp,vol,pan=0,hp=0){if(!ac)return;const t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type=hp?'highpass':'lowpass';f.frequency.value=hp||lp;const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(aout(pan));s.start(t,Math.random()*.5,dur+.05)}
function whiz(pan){if(!ac)return;const t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type='bandpass';f.Q.value=6;f.frequency.setValueAtTime(5200,t);f.frequency.exponentialRampToValueAtTime(1400,t+.16);
  const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+.17);s.connect(f);f.connect(g);g.connect(aout(pan));s.start(t,Math.random()*.5,.2)}
function boomSnd(v=1,pan=0){if(!ac)return;gunSnd(.9*v,500,1.1,70,pan);noiseHit(1.6,220,.8*v,pan)}
function hurtSnd(){gunSnd(.35,600,.18,90);blip(140,.18,'sawtooth',.06,-60)}
let rotorNode=null;
function rotorSound(on,vol=.2){if(!ac)return;if(on&&!rotorNode){const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=300;const g=ac.createGain();g.gain.value=vol;
  const lfo=ac.createOscillator();lfo.frequency.value=14;const lg=ac.createGain();lg.gain.value=vol*.8;lfo.connect(lg);lg.connect(g.gain);s.connect(f);f.connect(g);g.connect(master);s.start();lfo.start();rotorNode={s,g,lfo}}
  else if(!on&&rotorNode){try{rotorNode.s.stop();rotorNode.lfo.stop()}catch(e){}rotorNode=null}
  if(rotorNode)rotorNode.g.gain.value=vol}
