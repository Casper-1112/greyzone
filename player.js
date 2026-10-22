'use strict';
/* ================= player ================= */
let P=null;
function makePlayer(){return{pos:new T.Vector3(),vel:new T.Vector3(),vy:0,onGround:true,yaw:0,pitch:0,kick:0,crouch:0,crouchOn:false,slideT:0,slideDir:new T.Vector3(),
  hp:100,alive:true,downed:false,bleed:0,team:1,spectate:false,helmet:{id:'h0',tier:0,dur:0,max:0},armor:{id:'a0',tier:0,dur:0,max:0},
  ammo:{},ammoCap:{},slots:[],cur:0,prev:1,ads:false,adsK:0,reloadT:0,switchT:0,fireT:0,bloom:0,recoilDebt:0,vmKick:0,flashT:0,meleeT:0,healT:0,healAmt:0,healItem:null,repairT:0,nadeCd:0,
  torchOn:false,speed:0,sprint:false,bob:0,shake:0,dmgFlash:0,laddering:false,fallStart:0,
  op:'gale',cd:{s1:0,s2:0},ult:0,buff:{speedT:0,scanT:0,godT:0,heartT:0},zoomStage:1,charge:0,charging:false,zip:null,vault:null,padT:0,dmgDealt:0,assists:0,respawnT:0,
  eyeH(){return this.downed?.5:1.62-this.crouch*.6}}}

/* ================= inventory ================= */
let INV=null;
function makeInv(lo){const g=GEAR;return{pockets:{name:'口袋',cap:4,items:[]},rig:{name:'胸掛',cap:g.rig[lo.rig||'rig0'].cap,items:[]},bag:{name:'背包',cap:g.bag[lo.bag||'bag0'].cap,items:[]},safe:{name:'保險箱',cap:g.safe[PF.safe||'safe1'].cap,items:[]}}}
const INV_ORDER={use:['rig','pockets','bag'],val:['bag','pockets','rig']};
function invUsed(c){let s=0;for(const it of c.items)s+=ITEMS[it].s;return s}
function invFree(c){return c.cap-invUsed(c)}
function invAdd(id,only){const d=ITEMS[id];const order=only?[only]:(d.use||d.key?INV_ORDER.use:INV_ORDER.val);for(const k of order){const c=INV[k];if(c&&invFree(c)>=d.s){c.items.push(id);return k}}return null}
function invCount(id){let n=0;for(const k in INV)for(const it of INV[k].items)if(it===id)n++;return n}
function invTake(id){for(const k of ['rig','pockets','bag','safe']){const c=INV[k];const i=c.items.indexOf(id);if(i>=0){c.items.splice(i,1);return true}}return false}
function invValue(includeSafe=true){let v=0;for(const k in INV){if(k==='safe'&&!includeSafe)continue;for(const it of INV[k].items)if(!ITEMS[it].use)v+=ITEMS[it].v}return v}
function hasKey(col){for(const k in INV)for(const it of INV[k].items)if(ITEMS[it].key===col)return true;return false}

/* ================= viewmodels ================= */
const VMM={};
function vmMats(){if(VMM.metal)return VMM;Object.assign(VMM,{metal:new T.MeshStandardMaterial({color:0x232420,roughness:.45,metalness:.65}),poly:new T.MeshStandardMaterial({color:0x3e3a2e,roughness:.8}),tan:new T.MeshStandardMaterial({color:0x8a7650,roughness:.8}),
  wood:new T.MeshStandardMaterial({color:0x6b4528,roughness:.7}),glove:new T.MeshStandardMaterial({color:0x2f3128,roughness:.9}),sleeve:new T.MeshStandardMaterial({color:0x5b5440,roughness:.95}),
  blade:new T.MeshStandardMaterial({color:0xb8bcc0,roughness:.25,metalness:.9}),red:new T.MeshBasicMaterial({color:0xff3020}),green:new T.MeshBasicMaterial({color:0x7dffb0}),lens:new T.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:.14}),lensDark:new T.MeshBasicMaterial({color:0x2a4a6a})});return VMM}
const VMSPEC={ // len units in m (viewmodel space)
  rifle:{bw:.05,bh:.07,bl:.42,bz:-.05,hg:[.052,.055,.3,-.38,'tan'],br:[.012,.2,-.62],mag:[.034,.12,.055,-.07,.22,'poly'],stock:.24,rail:.04,muz:-.73,front:-.5},
  ak:{bw:.052,bh:.075,bl:.44,bz:-.05,hg:[.056,.06,.26,-.36,'wood'],br:[.013,.24,-.6],mag:[.036,.13,.06,-.07,.45,'poly'],stock:.26,stockMat:'wood',rail:.042,muz:-.74,front:-.6},
  smg:{bw:.048,bh:.08,bl:.32,bz:-.03,hg:[.05,.06,.14,-.26,'poly'],br:[.011,.1,-.38],mag:[.03,.14,.045,-.05,.05,'metal'],stock:.18,rail:.045,muz:-.44,front:-.32},
  shotgun:{bw:.056,bh:.075,bl:.32,bz:-.02,hg:[.05,.05,.16,-.34,'poly'],br:[.016,.5,-.42],mag:null,stock:.25,stockMat:'tan',rail:.038,muz:-.68,front:-.66,pump:true},
  dmr:{bw:.05,bh:.075,bl:.44,bz:-.05,hg:[.054,.058,.34,-.42,'tan'],br:[.013,.32,-.72],mag:[.036,.08,.06,-.06,0,'poly'],stock:.27,rail:.044,muz:-.9,front:-.56},
  sniper:{bw:.05,bh:.07,bl:.38,bz:-.03,hg:[.05,.06,.3,-.36,'tan'],br:[.012,.62,-.52],mag:[.036,.07,.07,-.06,0,'poly'],stock:.3,stockMat:'tan',rail:.045,muz:-.88,front:-.6},
  lmg:{bw:.06,bh:.09,bl:.48,bz:-.05,hg:[.06,.065,.3,-.42,'poly'],br:[.016,.36,-.72],mag:[.09,.09,.09,-.02,0,'metal'],stock:.24,rail:.05,muz:-.92,front:-.58,bipod:true},
  pistol:{bw:.032,bh:.04,bl:.19,bz:-.08,hg:null,br:null,mag:[.028,.1,.042,0,-.25,'poly'],stock:0,rail:.022,muz:-.2,front:-.17,pistol:true},
};
function buildVM(wid,build,preview){const m=vmMats();const S=VMSPEC[WEAPONS[wid].model];const g=new T.Group();const st=weaponStats(wid,build);
  const B=(w,h,d,mt,x,y,z,rx=0,par=g)=>{const b=new T.Mesh(new T.BoxGeometry(w,h,d),mt);b.position.set(x,y,z);b.rotation.x=rx;par.add(b);return b};
  const Cy=(r,len,mt,x,y,z,open=false,par=g)=>{const c=new T.Mesh(new T.CylinderGeometry(r,r,len,12,1,open),mt);c.rotation.x=Math.PI/2;c.position.set(x,y,z);par.add(c);return c};
  B(S.bw,S.bh,S.bl,m.metal,0,0,S.bz);
  if(S.pistol){B(.03,.03,.16,m.poly,0,-.03,-.07);B(.028,.07,.04,m.poly,0,-.06,.0,-.25);if(!preview){B(.05,.07,.08,m.glove,0,-.06,.02);B(.07,.07,.3,m.sleeve,.02,-.1,.2,.4);B(.045,.06,.08,m.glove,-.03,-.065,0)}}
  else{const hg=S.hg;B(hg[0],hg[1],hg[2],m[hg[4]],0,-.004,hg[3]);if(S.br)Cy(S.br[0],S.br[1],m.metal,0,.004,S.br[2]);
    B(.036,.09,.04,m.poly,0,-.065,.1,-.32);
    // stock
    const sl=S.stock*(build&&build.stock==='stLight'?.8:1),smt=m[S.stockMat||'poly'];
    if(build&&build.stock==='stHeavy'){B(.05,.08,sl,smt,0,-.018,.12+sl/2);B(.05,.03,.04,m.metal,0,-.06,.12+sl)}else if(build&&build.stock==='stLight'){B(.012,.05,sl,m.metal,.016,-.014,.12+sl/2);B(.012,.05,sl,m.metal,-.016,-.014,.12+sl/2);B(.044,.06,.02,m.poly,0,-.016,.12+sl)}
    else B(.042,.06,sl,smt,0,-.012,.12+sl/2);
    // hands
    if(!preview){B(.06,.06,.11,m.glove,-.012,-.045,hg[3]);B(.07,.07,.3,m.sleeve,-.06,-.09,hg[3]+.18,-.25);B(.055,.065,.09,m.glove,.012,-.06,.1);B(.07,.07,.3,m.sleeve,.06,-.11,.26,.35)}
    if(S.bipod){B(.01,.12,.01,m.metal,.02,-.07,hg[3]-.1,.3);B(.01,.12,.01,m.metal,-.02,-.07,hg[3]-.1,.3)}
    if(S.pump){Cy(.013,.36,m.metal,0,-.024,-.36)}
    if(build&&build.grip&&attAllowed(wid,build.grip)){const gz=hg[3]-.04;if(build.grip==='gripA')B(.03,.04,.07,m.poly,0,-.05,gz,.6);else B(.028,.08,.03,m.poly,0,-.07,gz)}}
  // magazine
  let mag=null;if(S.mag){let [w,h,d,z,rx,mt]=S.mag;let mul=1;if(build&&build.mag==='magExt')mul=1.4;if(build&&build.mag==='magDrum'&&!S.pistol){mag=Cy(.06,.05,m[mt],0,-.08,z);mag.rotation.set(0,0,Math.PI/2)}
    else mag=B(w,h*mul,d,m[mt],0,-(S.pistol?.03:S.bh*.5)-h*mul*.5+.01,z,rx)}
  // optic / sights
  const railY=S.rail;let sightY=railY+.016,scope=false;
  if(!S.pistol)B(.026,.01,.24,m.metal,0,railY-.005,-.12);
  const opt=st.optic;
  if(!opt){B(.004,.022,.004,m.metal,0,railY+.008,S.front);B(.016,.01,.008,m.metal,-.0,railY+.003,S.pistol?.005:-.02);B(.004,.004,.004,S.pistol?m.green:m.metal,0,railY+.018,S.front);sightY=railY+.017}
  else if(opt==='rd'||opt==='holo'){const z=-.08,hw=opt==='holo'?.022:.017;sightY=railY+.026;B(.036,.008,.05,m.metal,0,railY+.004,z);B(.004,.034,.04,m.metal,-hw,sightY,z);B(.004,.034,.04,m.metal,hw,sightY,z);B(hw*2+.004,.004,.04,m.metal,0,sightY+.017,z);
    const dot=new T.Mesh(opt==='holo'?new T.RingGeometry(.003,.0042,16):new T.SphereGeometry(.0028,8,6),opt==='holo'?new T.MeshBasicMaterial({color:0xff3020,side:T.DoubleSide}):m.red);dot.position.set(0,sightY,z-.02);g.add(dot);
    const ln=new T.Mesh(new T.PlaneGeometry(hw*2,.03),m.lens);ln.position.set(0,sightY,z-.019);g.add(ln)}
  else{const r=opt==='x2'?.016:.022,len=opt==='x2'?.12:opt==='x4'?.2:.27;sightY=railY+r+.012;Cy(r,len,m.metal,0,sightY,-.08,true);B(.012,.016,.012,m.metal,0,railY+.008,-.08-len*.3);B(.012,.016,.012,m.metal,0,railY+.008,-.08+len*.3);
    const l1=new T.Mesh(new T.CircleGeometry(r*.92,14),opt==='x2'?m.lens:m.lensDark);l1.position.set(0,sightY,-.08-len/2);l1.rotation.y=Math.PI;g.add(l1);
    if(opt==='x2'){const dot=new T.Mesh(new T.SphereGeometry(.0022,6,4),m.red);dot.position.set(0,sightY,-.08-len/2+.002);g.add(dot)}scope=st.scope}
  // muzzle devices
  let muzZ=S.muz;if(build&&build.muzzle==='supp'&&attAllowed(wid,'supp')){Cy(S.pistol?.014:.02,S.pistol?.12:.16,m.metal,0,.004,S.muz-(S.pistol?.06:.08));muzZ-=S.pistol?.12:.16}
  else if(build&&build.muzzle==='comp'){B(.026,.026,.06,m.metal,0,.004,S.muz-.03);muzZ-=.06}
  const fl=new T.Sprite(new T.SpriteMaterial({map:flashTex,blending:T.AdditiveBlending,depthWrite:false,transparent:true}));fl.position.set(0,.004,muzZ-.05);fl.scale.setScalar(build&&build.muzzle==='supp'?.08:S.pistol?.16:.26);fl.visible=false;g.add(fl);
  g.visible=false;if(!preview)vmScene.add(g);
  const hip=S.pistol?new T.Vector3(.12,-.12,-.3):new T.Vector3(.13,-.13,-.3);
  return{g,fl,mag,magY:mag?mag.position.y:0,pump:S.pump?g.children.find(c=>c.position.z===S.hg[3]):null,pumpZ:S.hg?S.hg[3]:0,hip,ads:new T.Vector3(0,-sightY,S.pistol?-.27:-.24),scope}}
function buildKnifeVM(){const m=vmMats();const g=new T.Group();const h=new T.Mesh(new T.BoxGeometry(.025,.03,.11),m.poly);h.position.set(0,0,.03);g.add(h);
  const bl=new T.Mesh(new T.BoxGeometry(.006,.032,.17),m.blade);bl.position.set(0,.004,-.11);g.add(bl);const gd=new T.Mesh(new T.BoxGeometry(.04,.012,.012),m.metal);gd.position.set(0,0,-.025);g.add(gd);
  const hand=new T.Mesh(new T.BoxGeometry(.055,.065,.09),m.glove);hand.position.set(0,-.02,.03);g.add(hand);const sl=new T.Mesh(new T.BoxGeometry(.07,.07,.3),m.sleeve);sl.position.set(.02,-.05,.2);sl.rotation.x=.3;g.add(sl);
  g.visible=false;vmScene.add(g);return{g,hip:new T.Vector3(.14,-.12,-.28),ads:new T.Vector3(.14,-.12,-.28),knife:true}}
function disposeVMs(){if(!P)return;for(const s of P.slots)if(s&&s.vm){vmScene.remove(s.vm.g)}}

/* ================= loadout → player ================= */
function makeSlot(wid){if(!wid||wid==='knife')return null;const b=PF.builds[wid]||{};const st=weaponStats(wid,b);return{wid,def:WEAPONS[wid],build:b,st,mag:st.mag,vm:buildVM(wid,b)}}
function setupPlayer(lo,spawn,conquest){
  disposeVMs();P=makePlayer();P.op=PF.operator;P.pos.set(spawn.x,spawn.y||0,spawn.z);P.yaw=spawn.yaw||0;
  const H=GEAR.helmet[conquest?'h2':lo.helmet],A=GEAR.armor[conquest?'a3':lo.armor];
  P.helmet={id:lo.helmet,tier:H.tier,dur:H.dur,max:H.dur};P.armor={id:lo.armor,tier:A.tier,dur:A.dur,max:A.dur};
  const mul=GEAR.pouch[lo.pouch||'pouch0'].mul;for(const k in AMMO){P.ammoCap[k]=Math.round(AMMO[k].base*mul);P.ammo[k]=0}
  const mk=makeSlot;
  P.slots=MUT('pistolonly')?[null,null,mk(lo.pistol||'p9'),{knife:true,vm:buildKnifeVM()}]:[mk(lo.p1),mk(lo.p2),mk(lo.pistol||'p9'),{knife:true,vm:buildKnifeVM()}];
  P.cur=P.slots[0]?0:P.slots[1]?1:2;P.prev=2;
  INV=makeInv(conquest?{rig:'rig1',bag:'bag0'}:lo);
  if(conquest){for(const k in AMMO)P.ammo[k]=P.ammoCap[k];for(let i=0;i<2;i++){invAdd('med');invAdd('nade')}}
  else{for(const s of P.slots)if(s&&s.def){const c=s.def.ammo;const take=Math.min(P.ammoCap[c]-P.ammo[c],(PF.ammo[c]||0));P.ammo[c]+=take;PF.ammo[c]=(PF.ammo[c]||0)-take}
    for(let i=0;i<(lo.meds||0);i++)if(invAdd('med'))addOwn('stash','med',-1);
    for(let i=0;i<(lo.nades||0);i++)if(invAdd('nade'))addOwn('stash','nade',-1);
    if(lo.repair&&ownCount('stash','repair')>0&&invAdd('repair'))addOwn('stash','repair',-1);
    if(lo.keys){for(const k of ['keyR','keyB'])if(ownCount('stash',k)>0&&invAdd(k))addOwn('stash',k,-1)}
    if(lo.flare&&ownCount('stash','flare')>0&&invAdd('flare'))addOwn('stash','flare',-1)}
  P.cd.s1=3;P.cd.s2=6;P.ult=conquest?30:0;P.torchOn=M.tod==='night';P.team=1;P.slots.forEach(x=>x&&x.knife===undefined&&0);
}

/* ================= input ================= */
const keys={},mouse={l:false,lPressed:false};let lookDX=0,lookDY=0,locked=false,fallbackLook=false,everLocked=false;
const touchS={stickId:null,ox:0,oy:0,jx:0,jy:0,lookId:null,lx:0,ly:0,fireId:null,fx:0,fy:0};
const GAMEKEYS=['Space','KeyW','KeyA','KeyS','KeyD','KeyC','KeyE','KeyR','KeyG','KeyH','KeyQ','KeyZ','KeyX','KeyV','KeyF','KeyT','KeyM','Tab','Digit1','Digit2','Digit3','Digit4','ShiftLeft','ShiftRight'];
addEventListener('keydown',e=>{if(!M.running||M.paused||UI.chatting)return;if(UI.invOpen&&e.code!=='Tab'&&e.code!=='Escape')return;keys[e.code]=true;if(GAMEKEYS.includes(e.code))e.preventDefault();if(e.repeat)return;
  if(e.code==='Tab'){if(M.mode==='extract')toggleInventory();else UI.scoreboard(true);return}if(e.code==='KeyM'){toggleBigMap();return}
  if(e.code==='Enter'&&M.net){UI.openChat();e.preventDefault();return}
  if(/^F[1-3]$/.test(e.key)&&MODES[M.mode].respawn){e.preventDefault();PF.preset=+e.key[1]-1;savePF();note('下次重生使用：'+PF.presets[PF.preset].name);return}
  if(e.code==='Space'&&UI.killcamOn){UI.skipKillcam();return}
  if(!P||!P.alive)return;
  if(e.code==='KeyR')startReload();else if(/^Digit[1-4]$/.test(e.code))switchTo(+e.code[5]-1);else if(e.code==='KeyF')toggleTorch();
  else if(e.code==='KeyG')startCharge();else if(e.code==='KeyH')startHeal();else if(e.code==='KeyT')startRepair();else if(e.code==='KeyV')quickMelee();
  else if(e.code==='KeyQ')useSkill('s1');else if(e.code==='KeyZ')useSkill('s2');else if(e.code==='KeyX')useSkill('s3');
  else if(e.code==='KeyC'){if(P.sprint&&P.onGround&&P.slideT<=0)startSlide();else P.crouchOn=!P.crouchOn}
  else if(e.code==='KeyE')tapInteract()});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyG'&&P&&P.charging)releaseThrow();if(e.code==='Tab'&&M.running&&M.mode!=='extract')UI.scoreboard(false)});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.l=false});
canvas.addEventListener('mousedown',e=>{if(!M.running||M.paused||UI.invOpen)return;if(!locked&&!fallbackLook&&!isTouch){lockPointer(true);return}
  if(e.button===0){mouse.l=true;mouse.lPressed=true}if(e.button===2&&P&&P.alive){if(PF.settings.adsMode==='hold'){P.ads=true;P.zoomStage=1}else toggleADS()}});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2&&P&&PF.settings.adsMode==='hold')P.ads=false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(!M.running||M.paused||UI.invOpen||(!locked&&!fallbackLook))return;lookDX+=clamp(e.movementX||0,-250,250);lookDY+=clamp(e.movementY||0,-250,250)});
canvas.addEventListener('wheel',e=>{if(M.running&&P&&P.alive)switchTo(nextSlot(e.deltaY>0?1:-1))},{passive:true});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(locked){everLocked=true;if(M.paused)resumeGame()}else if(M.running&&!M.paused&&!fallbackLook&&!UI.invOpen&&!UI.mapOpen&&!UI.respawnOpen&&!UI.chatting&&!UI.killcamOn&&!M.ending)pauseGame()});
let lockGesture=false;
function lockFailed(){if(!everLocked&&lockGesture){fallbackLook=true;if(M.paused)resumeGame()}else if(M.running&&!fallbackLook&&!UI.invOpen&&!UI.mapOpen&&!UI.respawnOpen&&!UI.chatting)UI.needClick()}
document.addEventListener('pointerlockerror',lockFailed);
function lockPointer(g){if(isTouch||fallbackLook)return;lockGesture=!!g||!!(navigator.userActivation&&navigator.userActivation.isActive);try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(lockFailed)}catch(e){lockFailed()}}
function unlockPointer(){if(document.pointerLockElement)document.exitPointerLock()}

/* ================= actions ================= */
function nextSlot(dir){let i=P.cur;for(let k=0;k<4;k++){i=(i+dir+4)%4;if(P.slots[i])return i}return P.cur}
function switchTo(i){if(!P.slots[i]||i===P.cur||!P.alive||P.downed)return;P.prev=P.cur;P.cur=i;P.reloadT=0;P.switchT=.42;P.ads=false;mouse.lPressed=false;blip(600,.04,'square',.03);blip(450,.05,'square',.03,0,.2)}
function toggleADS(){const s=P.slots[P.cur];if(!s||s.knife)return;if(!P.ads){P.ads=true;P.zoomStage=1}else if(s.st.scope&&P.zoomStage===1){P.zoomStage=2;blip(900,.03,'square',.03)}else P.ads=false}
function toggleTorch(){P.torchOn=!P.torchOn;blip(1300,.03,'square',.03)}
function curW(){return P.slots[P.cur]}
function startReload(){const s=curW();if(!s||s.knife||P.reloadT>0||P.switchT>0||s.mag>=s.st.mag||P.ammo[s.def.ammo]<=0||P.healT>0)return;P.reloadT=s.st.reload*(P.buff.speedT>0?.7:1);P.reloadDur=P.reloadT;blip(420,.05,'square',.04);blip(300,.05,'square',.04,0,.5)}
function startHeal(){if(P.healT>0||P.hp>=100||!P.alive||P.downed)return;const id=invCount('surg')&&P.hp<50?'surg':invCount('med')?'med':invCount('surg')?'surg':null;if(!id){note('沒有醫療物品');return}
  invTake(id);P.healItem=id;P.healT=ITEMS[id].time;P.healAmt=ITEMS[id].heal;P.reloadT=0;P.ads=false;blip(700,.08,'sine',.05)}
function startRepair(){if(P.repairT>0||!P.alive)return;if(P.armor.tier===0){note('沒有穿護甲');return}if(P.armor.dur>=P.armor.max){note('護甲耐久已滿');return}if(!invTake('repair')){note('沒有護甲維修包');return}P.repairT=ITEMS.repair.time;P.ads=false;blip(500,.08,'sine',.05)}
function throwNade(){startCharge();releaseThrow(.7)}
function startCharge(){if(P.nadeCd>0||P.reloadT>0||!P.alive||P.downed||P.charging)return;if(!invCount('nade')){note('沒有手榴彈');return}P.charging=true;P.charge=0;blip(300,.05,'triangle',.03)}
function releaseThrow(force){if(!P.charging)return;P.charging=false;const c=force!==undefined?force:P.charge;if(!invTake('nade'))return;P.nadeCd=.9;P.switchT=Math.max(P.switchT,.35);
  throwProjectile('frag',7+15*c+(P.sprint?3:0),{fuse:2.3});blip(500,.06,'triangle',.05,-200)}
function quickMelee(){if(P.meleeT>0||!P.alive||P.downed)return;P.meleeT=KNIFE.rate;P.meleeAnim=0;P.ads=false;doMelee()}
function startSlide(){P.slideT=.8;P.slideDir.set(P.vel.x,0,P.vel.z).normalize();P.crouchOn=true;noiseHit(.5,700,.12);P.shake=Math.max(P.shake,.15)}

/* ================= shooting ================= */
const _f=new T.Vector3(),_r=new T.Vector3(),_u=new T.Vector3(),_dir=new T.Vector3(),_mz=new T.Vector3();
function camFwd(t){return t.set(0,0,-1).applyQuaternion(camera.quaternion)}
function muzzleWorld(t){camFwd(_f);_r.set(1,0,0).applyQuaternion(camera.quaternion);_u.set(0,1,0).applyQuaternion(camera.quaternion);const k=1-P.adsK;return t.copy(camera.position).addScaledVector(_f,.75).addScaledVector(_r,.14*k).addScaledVector(_u,-.11*k-.02)}
function currentSpread(){const s=curW();if(!s||s.knife)return .03;const st=s.st;let sp=st.hip+(st.ads-st.hip)*P.adsK;const mv=clamp(P.speed/4.3,0,1.6);sp+=mv*(.022*(1-P.adsK*.7));if(!P.onGround)sp+=.05;if(P.slideT>0)sp+=.02;sp*=1-P.crouch*.3;sp+=P.bloom*(1-P.adsK*.6);return sp}
function playerShoot(){
  const s=curW(),st=s.st,d=s.def;
  if(s.mag<=0){blip(300,.04,'square',.04);P.fireT=.25;mouse.lPressed=false;if(P.ammo[d.ammo]>0)startReload();return}
  s.mag--;if(MUT('infammo'))P.ammo[d.ammo]=P.ammoCap[d.ammo];P.fireT=60/st.rpm;mouse.lPressed=false;camera.updateMatrixWorld();
  const sp=currentSpread();camFwd(_f);_r.set(1,0,0).applyQuaternion(camera.quaternion);_u.set(0,1,0).applyQuaternion(camera.quaternion);
  const muz=muzzleWorld(new T.Vector3());const pel=d.pel||1;const dmgMul=P.buff.scanT>0?1.2:1;
  for(let q=0;q<pel;q++){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*sp;const dir=_dir.copy(_f).addScaledVector(_r,Math.cos(a)*r).addScaledVector(_u,Math.sin(a)*r).normalize();
    const range=d.range;let wt=range;const wh=rayWorld(camera.position,dir,range);if(wh)wt=RH.t;const box=wh?RH.box:null,n={x:RH.nx,y:RH.ny,z:RH.nz};
    const ah=rayActors(camera.position,dir,wt,M.ff?null:P.team);
    const end=camera.position.clone().addScaledVector(dir,ah?ah.t:wt);
    if(ah){let dmg=st.dmg*dmgMul;const dist=ah.t;if(pel>1)dmg*=clamp(1-(dist-8)/32,.2,1);else if(dist>45&&!st.scope)dmg*=Math.max(.6,1-(dist-45)/140);
      if(ah.part==='head')dmg*=ah.isBot&&ah.ent.kind!=='grunt'&&ah.ent.kind!=='soldier'?Math.max(1.6,d.head*.7):d.head;else if(ah.part==='limb')dmg*=.72;
      emit(end,ah.part==='head'?10:6,'blood',ah.part==='head'?4:3,.5,.05,9.8,{x:dir.x*.6,y:dir.y*.6,z:dir.z*.6},1);
      if(ah.isBot&&!ah.ent.dead)P.dmgDealt+=Math.min(dmg,ah.ent.hp);
      if(ah.isBot)damageBot(ah.ent,dmg,ah.part,{player:true,pos:P.pos,wid:s.wid},dir);else if(typeof netHitPlayer==='function')netHitPlayer(ah.ent,dmg,ah.part);
      if(!ah.isBot||!ah.ent.dead)hitmark(ah.part==='head'?'head':'body')}
    else if(wh){emit(end,pel>1?2:5,'spark',5,.25,.03,6,n,.8);emit(end,pel>1?1:3,'dust',2,.5,.06,3,n,.6);decal(end,n.x,n.y,n.z);
      if(box){if(box.barrel)hitBarrel(box,st.dmg);if(box.turret||box.cam||box.shield||box.board)damageDevice(box,st.dmg);if(box.door&&!box.door.locked&&st.dmg>60&&false)toggleDoor(box.door)}}
    tracer(muz,end,0xffe2a0,st.scope?.03:.018)}
  const rk=st.recoil*(1-P.adsK*.4)*(1-P.crouch*.25);P.pitch+=rk*.65;P.recoilDebt+=rk*.65;P.kick+=rk*.5;P.yaw+=rnd(-.5,.5)*rk*.55;
  P.bloom=Math.min(P.bloom+(d.auto?.007:.012),.06);P.vmKick=pel>1||d.bolt?1.7:1;P.flashT=.045;if(s.vm.fl)s.vm.fl.material.rotation=Math.random()*TAU;
  const sup=s.build&&s.build.muzzle==='supp';
  if(!sup){lightFlash(_mz.copy(camera.position).addScaledVector(_f,1.2),1.8,9)}
  const sn=d.model==='shotgun'?[.8,650,.34,80]:d.model==='sniper'?[.9,800,.5,70]:d.slot==='pistol'?[.4,1500,.15,140]:d.model==='lmg'?[.55,900,.22,100]:[.5,1100,.2,110];
  if(sup)gunSnd(sn[0]*.35,2400,.1,0);else gunSnd(...sn);
  P.shake=Math.max(P.shake,pel>1||d.bolt?.6:.18);
  if(pel>1){blip(240,.06,'square',.04,0,.32);blip(330,.06,'square',.04,0,.48)}if(d.bolt){blip(300,.06,'square',.04,0,.5);blip(430,.06,'square',.04,0,.78)}
  alertNoise(P.pos,st.noise,P.pos);
  if(M.net)P.fireSeq=(P.fireSeq||0)+1;
}
function doMelee(){camera.updateMatrixWorld();camFwd(_f);const ah=rayActors(camera.position,_f,KNIFE.range,M.ff?null:P.team);noiseHit(.15,3000,.12,0,1500);
  if(ah){let dmg=ah.t<1.7?220:KNIFE.dmg;if(M.mode==='gungame'||M.mode==='oitc')dmg=999;if(ah.isBot){const b=ah.ent;const back=Math.cos(angDiff(Math.atan2(P.pos.x-b.pos.x,P.pos.z-b.pos.z),b.yaw))<-.3;if(back)dmg*=KNIFE.back;damageBot(b,dmg,'body',{player:true,pos:P.pos,how:back?'背刺':'刀殺'},_f);if(!b.dead)hitmark('body')}
    else if(typeof netHitPlayer==='function')netHitPlayer(ah.ent,dmg,'body');emit(camera.position.clone().addScaledVector(_f,ah.t),8,'blood',3,.4,.05);blip(180,.08,'sawtooth',.06)}
  else if(rayWorld(camera.position,_f,KNIFE.range)){emit(camera.position.clone().addScaledVector(_f,RH.t),5,'spark',3,.2,.03);blip(2200,.03,'square',.03);if(RH.box&&RH.box.board){RH.box.board.hp-=40;if(RH.box.board.hp<=0)breakBoard(RH.box)}}}

/* ================= projectiles / skills ================= */
const projs=[];const projGeo=new T.SphereGeometry(.075,10,8);
const projMats={frag:new T.MeshStandardMaterial({color:0x3c4632,roughness:.6}),flash:new T.MeshStandardMaterial({color:0x8a8a8a,roughness:.4,metalness:.5}),smoke:new T.MeshStandardMaterial({color:0x557a5a,roughness:.6}),dart:new T.MeshBasicMaterial({color:0x72c8f5}),flare:new T.MeshBasicMaterial({color:0xff4b3e})};
function throwProjectile(type,speed,opt={}){const m=new T.Mesh(projGeo,projMats[type]);m.castShadow=true;scene.add(m);camFwd(_f);
  m.position.copy(camera.position).addScaledVector(_f,.5);const v=_f.clone().multiplyScalar(speed).add(new T.Vector3(0,type==='dart'?1.5:3.2,0)).add(P.vel.clone().multiplyScalar(.6));
  projs.push({m,v,type,fuse:opt.fuse||2,stick:type==='dart',stuck:false,life:opt.life||0,owner:'local'});if(M.net&&typeof netSend==='function')netSend({t:'proj',type,x:m.position.x,y:m.position.y,z:m.position.z,vx:v.x,vy:v.y,vz:v.z,fuse:opt.fuse||2})}
function spawnRemoteProj(o){const m=new T.Mesh(projGeo,projMats[o.type]||projMats.frag);scene.add(m);m.position.set(o.x,o.y,o.z);projs.push({m,v:new T.Vector3(o.vx,o.vy,o.vz),type:o.type,fuse:o.fuse,stick:o.type==='dart',stuck:false,owner:'remote',visualOnly:true})}
function projInside(p){const q=gridQuery(p.x-.1,p.z-.1,p.x+.1,p.z+.1);for(const b of q)if(!b.off&&b.solid&&p.x>b.minX-.07&&p.x<b.maxX+.07&&p.z>b.minZ-.07&&p.z<b.maxZ+.07&&p.y>b.minY-.07&&p.y<b.maxY+.07)return true;return false}
function updateProjs(dt){for(let i=projs.length-1;i>=0;i--){const n=projs[i],p=n.m.position;n.fuse-=dt;
  if(!n.stuck){for(let s=0;s<3;s++){const h=dt/3;n.v.y-=20*h;
    p.x+=n.v.x*h;if(projInside(p)){p.x-=n.v.x*h;if(n.stick){n.stuck=true;break}n.v.x*=-.4}
    p.z+=n.v.z*h;if(projInside(p)){p.z-=n.v.z*h;if(n.stick){n.stuck=true;break}n.v.z*=-.4}
    p.y+=n.v.y*h;if(projInside(p)){p.y-=n.v.y*h;if(n.stick){n.stuck=true;break}n.v.y*=-.3;n.v.x*=.7;n.v.z*=.7}
    if(p.y<.075){p.y=.075;if(n.stick){n.stuck=true;break}if(Math.abs(n.v.y)>2)blip(900,.03,'triangle',.02);n.v.y*=-.3;n.v.x*=.7;n.v.z*=.7}}
    n.m.rotation.x+=n.v.length()*dt*2}
  if(n.type==='dart'&&n.stuck){if(n.life===0){n.life=12;n.fuse=12}if(!n.visualOnly)for(const b of bots)if(!b.dead&&b.team!==P.team&&b.pos.distanceTo(p)<25)b.markT=Math.max(b.markT,.3);if(Math.random()<dt*2)emit(p,1,'green',1,.6,.05,-1)}
  if(n.fuse<=0){scene.remove(n.m);projs.splice(i,1);
    if(n.type==='frag'){if(n.visualOnly){fireball(p.clone(),4.4);boomSnd(.6,panTo(p.x,p.z));emit(p,30,'fire',12,.6,.12,4)}else explode(p.clone(),8,240,{player:true,team:P.team})}
    else if(n.type==='flash'){emit(p,30,'white',10,.3,.06,0);lightFlash(p,12,30);blip(3000,.4,'sine',.15);if(!n.visualOnly){for(const b of bots)if(!b.dead&&b.team!==P.team&&b.pos.distanceTo(p)<9&&los(p.clone().setY(p.y+.3),_e1.set(b.pos.x,b.pos.y+1.6,b.pos.z))){b.stunT=3.5;if(b.puppet&&typeof netSend==='function')netSend({t:'stun',id:b.id})}}
      const pe=new T.Vector3(P.pos.x,P.pos.y+P.eyeH(),P.pos.z);if(pe.distanceTo(p)<9&&los(p,pe)){camFwd(_f);const to=p.clone().sub(pe).normalize();if(to.dot(_f)>.3)P.blindT=2.5}}
    else if(n.type==='smoke'){W.smokes.push({x:p.x,y:1.5,z:p.z,r:6.5,t:0,life:14});}
  }}
  for(let i=W.smokes.length-1;i>=0;i--){const s=W.smokes[i];s.t+=dt;if(s.t<s.life&&Math.random()<dt*7)puff({x:s.x+rnd(-s.r*.6,s.r*.6),y:.3,z:s.z+rnd(-s.r*.6,s.r*.6)},1,6,4,0xcfd2cc,.85,.5,.25);if(s.t>s.life+2)W.smokes.splice(i,1)}
  // drones
  for(let i=drones.length-1;i>=0;i--){const d=drones[i];d.t+=dt;const p=d.m.position;
    if(!d.tgt||d.tgt.dead){let best=null,bd=46;for(const b of bots){if(b.dead||b.team===P.team||d.claimed.has(b))continue;const dd=b.pos.distanceTo(p);if(dd<bd){bd=dd;best=b}}d.tgt=best;if(best)d.claimed.add(best)}
    const tg=d.tgt?_e1.set(d.tgt.pos.x,d.tgt.pos.y+1.2,d.tgt.pos.z):_e1.copy(p).add(new T.Vector3(Math.sin(d.t*3+i),.3,Math.cos(d.t*3+i)));
    const dir=_e2.subVectors(tg,p);const L=dir.length();dir.multiplyScalar(1/(L||1));d.v.lerp(dir.multiplyScalar(18),Math.min(1,dt*4));p.addScaledVector(d.v,dt);d.m.lookAt(tg);
    if((d.tgt&&L<1.2)||d.t>9){scene.remove(d.m);drones.splice(i,1);if(d.visualOnly){fireball(p.clone(),2.2);boomSnd(.4,panTo(p.x,p.z))}else explode(p.clone(),4.5,95,{player:true,team:P.team,selfSafe:true})}}
  for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];r.delay-=dt;if(r.delay>0)continue;if(!r.m){r.m=new T.Mesh(new T.CylinderGeometry(.08,.08,.8,8),projMats.flare);scene.add(r.m);r.m.position.set(r.x+rnd(-20,20),60,r.z+rnd(-20,20));r.m.lookAt(r.x,0,r.z);r.m.rotateX(Math.PI/2)}
    const to=_e1.set(r.x,0,r.z).sub(r.m.position);const L=to.length();to.normalize();r.m.position.addScaledVector(to,Math.min(L,70*dt));emit(r.m.position,1,'fire',2,.4,.15,-1);
    if(L<.6){scene.remove(r.m);rockets.splice(i,1);if(r.visualOnly){fireball(new T.Vector3(r.x,.5,r.z),3.5);boomSnd(.8,panTo(r.x,r.z))}else explode(new T.Vector3(r.x,.5,r.z),6.5,150,{player:true,team:P.team})}}
  for(let i=W.shields.length-1;i>=0;i--){const s=W.shields[i];s.t-=dt;if(s.t<=0||s.hp<=0){s.box.off=true;scene.remove(s.mesh);W.shields.splice(i,1);if(s.hp<=0)emit(new T.Vector3(s.x,1,s.z),20,'spark',6,.5,.05)}else s.mesh.material.opacity=.35+.2*Math.sin(M.t*6)}
}
const drones=[],rockets=[];
function useSkill(k){const o=OPERATORS[P.op];if(!P.alive||P.downed)return;
  if(k==='s3'){if(P.ult<100){note(`大招充能 ${Math.floor(P.ult)}%`);return}P.ult=0}else{if(P.cd[k]>0){note(`${o[k].name} 冷卻中 ${Math.ceil(P.cd[k])} 秒`);return}P.cd[k]=o[k].cd}
  const id=P.op+'.'+k;banner(o[k].name,'',1);blip(660,.12,'triangle',.06);blip(990,.15,'triangle',.06,0,.1);
  doSkill(id,true);if(M.net&&typeof netSend==='function')netSend({t:'skill',id,x:P.pos.x,y:P.pos.y,z:P.pos.z,yaw:P.yaw,pitch:P.pitch})}
function doSkill(id,local,src){const pos=local?P.pos:new T.Vector3(src.x,src.y,src.z);
  switch(id){
  case 'gale.s1':if(local)P.buff.speedT=6;break;
  case 'gale.s2':if(local)throwProjectile('flash',16,{fuse:1.2});break;
  case 'gale.s3':for(let i=0;i<8;i++){const m=new T.Mesh(new T.BoxGeometry(.25,.08,.25),projMats.dart);m.position.set(pos.x+rnd(-1,1),pos.y+2+rnd(0,1),pos.z+rnd(-1,1));scene.add(m);drones.push({m,v:new T.Vector3(rnd(-3,3),4,rnd(-3,3)),t:0,tgt:null,claimed:new Set(),visualOnly:!local})}break;
  case 'owl.s1':if(local){P.buff.heartT=6}break;
  case 'owl.s2':if(local)throwProjectile('dart',22,{fuse:20});break;
  case 'owl.s3':if(local){P.buff.scanT=8}break;
  case 'bulwark.s1':if(local){if(P.armor.tier===0){P.armor={id:'temp',tier:2,dur:50,max:50}}else P.armor.dur=Math.min(P.armor.max,P.armor.dur+50)}break;
  case 'bulwark.s2':{const yaw=local?P.yaw:src.yaw;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);const x=pos.x+fx*1.6,z=pos.z+fz*1.6;const alongX=Math.abs(fz)>Math.abs(fx);
    const w=alongX?3:.25,d=alongX?.25:3;const mesh=new T.Mesh(new T.BoxGeometry(w,1.9,d),new T.MeshBasicMaterial({color:0x72c8f5,transparent:true,opacity:.45,depthWrite:false}));mesh.position.set(x,pos.y+.95,z);scene.add(mesh);
    const box={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:pos.y,maxY:pos.y+1.9,solid:true,shoot:true,kind:'shield'};const s={x,z,box,mesh,hp:400,t:25};box.shield=s;W.boxes.push(box);gridAdd(box);W.shields.push(s);break}
  case 'bulwark.s3':{let tx=pos.x,tz=pos.z;if(local){camera.updateMatrixWorld();camFwd(_f);if(rayWorld(camera.position,_f,200)){const p=camera.position.clone().addScaledVector(_f,RH.t);tx=p.x;tz=p.z}else{tx=pos.x+_f.x*60;tz=pos.z+_f.z*60}}else{tx=src.tx;tz=src.tz}
    if(local&&M.net)netSend({t:'rockets',x:tx,z:tz});
    emit(new T.Vector3(tx,.3,tz),20,'red',3,1.5,.1,-2);for(let i=0;i<6;i++)rockets.push({x:tx+rnd(-5,5),z:tz+rnd(-5,5),delay:1+i*.33,m:null,visualOnly:!local});break}
  case 'heron.s1':if(local){P.regenT=3;P.regenAmt=35}if(!local&&src&&P.alive&&P.pos.distanceTo(pos)<10){P.regenT=3;P.regenAmt=35}break;
  case 'heron.s2':if(local)throwProjectile('smoke',15,{fuse:1.5});break;
  case 'heron.s3':if(local){P.buff.godT=6;P.hp=100}if(!local&&src&&P.downed&&P.pos.distanceTo(pos)<15)revivePlayer();break;
  }}

/* ================= damage ================= */
function damagePlayer(dmg,src,info={}){
  if(!P||!P.alive||P.spectate)return;if(P.buff.godT>0){P.shake=Math.max(P.shake,.2);return}
  if(P.downed){P.bleed-=dmg*.05;return}
  const pr=info.head?P.helmet:P.armor;
  if(pr.tier>0&&pr.dur>0&&!info.explosion){const prot=TIER_PROT[pr.tier];const ab=dmg*prot;pr.dur=Math.max(0,pr.dur-dmg*.55);dmg-=ab}
  else if(info.explosion&&P.armor.tier>0&&P.armor.dur>0){dmg*=1-TIER_PROT[P.armor.tier]*.5;P.armor.dur=Math.max(0,P.armor.dur-dmg*.4)}
  if(info.head&&P.helmet.tier===0)dmg*=1.6;
  if(MUT('hardcore')&&!info.fall&&!info.gas)dmg*=1.5;if(M.countdown>0)return;P.lastHit={src:info.bot||null,by:info.by||null,pos:src?src.clone?src.clone():new T.Vector3(src.x,src.y||0,src.z):null};
  P.hp-=dmg;P.dmgFlash=Math.min(1,P.dmgFlash+.45);P.shake=Math.max(P.shake,.5);P.kick+=rnd(-.01,.02);P.yaw+=rnd(-.012,.012);
  if(src)dmgDir(src);hurtSnd();P.healT=0;P.repairT=0;
  if(P.hp<=0){P.hp=0;playerDown(info)}}
function playerDown(info){
  const teammates=M.net&&Object.values(netPuppets).some(p=>p.alive&&!p.downed&&p.team===P.team);
  if((M.mode==='extract'||M.mode==='zombie')&&teammates&&!P.downed){P.downed=true;P.bleed=40;P.ads=false;banner('你倒地了','等待隊友救援',2.5);return}
  playerDie(info)}
function playerDie(info){P.alive=false;P.downed=false;P.ads=false;banner('陣亡','',2);boomSnd(.3);onPlayerDied(info)}
function revivePlayer(){if(!P.downed)return;P.downed=false;P.hp=30;banner('已被救起','',1.5)}
