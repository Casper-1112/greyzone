'use strict';
/* ================= static game data ================= */
const AMMO={
  '556':{name:'5.56 步槍彈',base:150,price:12},
  '762':{name:'7.62 步槍彈',base:120,price:16},
  '9mm':{name:'9mm 手槍彈',base:150,price:6},
  '12g':{name:'12 號霰彈',base:40,price:30},
  '338':{name:'.338 狙擊彈',base:30,price:80},
  '50ae':{name:'.50 手槍彈',base:42,price:40},
};
// model: viewmodel family; slot: long | pistol
const WEAPONS={
  m7:  {name:'M7 突擊步槍',cls:'突擊步槍',slot:'long',model:'rifle',auto:true,rpm:680,dmg:30,head:2.3,mag:30,reload:2.1,hip:.03,ads:.0028,recoil:.015,range:150,ammo:'556',noise:48,adsT:.2,price:26000},
  kv47:{name:'KV-47 突擊步槍',cls:'突擊步槍',slot:'long',model:'ak',auto:true,rpm:560,dmg:38,head:2.2,mag:30,reload:2.4,hip:.034,ads:.0034,recoil:.021,range:150,ammo:'762',noise:50,adsT:.22,price:31000},
  v9:  {name:'V9 衝鋒槍',cls:'衝鋒槍',slot:'long',model:'smg',auto:true,rpm:920,dmg:22,head:2.0,mag:32,reload:1.8,hip:.022,ads:.004,recoil:.009,range:80,ammo:'9mm',noise:40,adsT:.15,move:1.06,price:17000},
  k12: {name:'K12 霰彈槍',cls:'霰彈槍',slot:'long',model:'shotgun',auto:false,rpm:75,dmg:15,pel:9,head:1.6,mag:6,reload:2.6,hip:.075,ads:.05,recoil:.05,range:45,ammo:'12g',noise:45,adsT:.22,price:15000},
  d14: {name:'D14 射手步槍',cls:'射手步槍',slot:'long',model:'dmr',auto:false,rpm:300,dmg:62,head:2.4,mag:15,reload:2.5,hip:.05,ads:.0012,recoil:.03,range:220,ammo:'762',noise:58,adsT:.26,price:42000},
  r90: {name:'R90 狙擊步槍',cls:'狙擊步槍',slot:'long',model:'sniper',auto:false,rpm:48,dmg:125,head:3,mag:5,reload:3,hip:.08,ads:.0003,recoil:.06,range:320,ammo:'338',noise:70,adsT:.32,bolt:true,baseZoom:1.4,price:62000},
  l60: {name:'L60 輕機槍',cls:'輕機槍',slot:'long',model:'lmg',auto:true,rpm:720,dmg:32,head:2.1,mag:100,reload:4.2,hip:.045,ads:.005,recoil:.017,range:150,ammo:'762',noise:55,adsT:.32,move:.9,price:56000},
  p9:  {name:'P9 手槍',cls:'手槍',slot:'pistol',model:'pistol',auto:false,rpm:460,dmg:40,head:2.5,mag:15,reload:1.35,hip:.018,ads:.004,recoil:.03,range:90,ammo:'9mm',noise:38,adsT:.12,price:0,free:true},
  d50: {name:'D50 重型手槍',cls:'手槍',slot:'pistol',model:'pistol',auto:false,rpm:200,dmg:70,head:2.4,mag:7,reload:1.8,hip:.025,ads:.005,recoil:.06,range:100,ammo:'50ae',noise:48,adsT:.14,price:14000},
};
const KNIFE={name:'戰術刀',dmg:55,back:3,range:2.2,rate:.55};
const ATT_SLOTS=['optic','stock','grip','mag','muzzle'];
const ATT_SLOT_NAME={optic:'倍鏡',stock:'槍托',grip:'握把',mag:'彈匣',muzzle:'槍口'};
const ATTS={
  rd:   {slot:'optic',name:'紅點瞄具',zoom:1.25,price:2500,desc:'開鏡更清楚'},
  holo: {slot:'optic',name:'全息瞄具',zoom:1.4,price:4000,desc:'較大視野的反射式瞄具'},
  x2:   {slot:'optic',name:'2 倍鏡',zoom:2,price:6000,desc:'中距離'},
  x4:   {slot:'optic',name:'4 倍鏡',zoom:4,scope:true,price:9000,desc:'中遠距離，全鏡視野'},
  x8:   {slot:'optic',name:'8 倍狙擊鏡',zoom:8,scope:true,price:15000,desc:'遠距離狙擊'},
  stLight:{slot:'stock',name:'輕量槍托',adsT:-.06,move:.05,recoil:.08,price:3000,desc:'開鏡快、移動快，後座稍大'},
  stHeavy:{slot:'stock',name:'重型槍托',recoil:-.18,adsT:.05,price:4500,desc:'大幅降低後座，開鏡較慢'},
  stTac:{slot:'stock',name:'戰術槍托',recoil:-.1,spread:-.1,price:6500,desc:'均衡提升穩定'},
  gripV:{slot:'grip',name:'垂直握把',recoil:-.13,price:3500,desc:'降低垂直後座'},
  gripA:{slot:'grip',name:'斜角握把',adsT:-.05,recoil:-.05,price:3500,desc:'開鏡更快'},
  gripS:{slot:'grip',name:'穩定握把',spread:-.25,price:4500,desc:'腰射更準'},
  magExt:{slot:'mag',name:'擴容彈匣',magMul:1.5,reload:.3,price:5000,desc:'彈容 ×1.5，換彈稍慢'},
  magDrum:{slot:'mag',name:'彈鼓',magMul:2.2,reload:.8,adsT:.05,move:-.04,price:9000,desc:'彈容 ×2.2，笨重'},
  magFast:{slot:'mag',name:'快拔彈匣',reload:-.4,price:5500,desc:'換彈更快'},
  supp:{slot:'muzzle',name:'消音器',noise:-.65,dmg:-.05,price:7000,desc:'槍聲傳得很近，敵人難以察覺'},
  comp:{slot:'muzzle',name:'補償器',recoil:-.15,price:4000,desc:'降低後座'},
};
function attAllowed(wid,aid){const w=WEAPONS[wid],a=ATTS[aid];if(!w||!a)return false;
  if(w.slot==='pistol')return ['rd','holo','magExt','magFast','supp','comp'].includes(aid);
  if(w.model==='shotgun'&&(aid==='x4'||aid==='x8'||aid==='magDrum'))return false;
  if(w.model==='lmg'&&a.slot==='mag')return aid==='magFast';
  return true}
function weaponStats(wid,build){
  const w=WEAPONS[wid];const s={dmg:w.dmg,rpm:w.rpm,mag:w.mag,reload:w.reload,hip:w.hip,ads:w.ads,recoil:w.recoil,adsT:w.adsT,zoom:w.baseZoom||1.15,scope:false,noise:w.noise,move:w.move||1,optic:null};
  for(const sl of ATT_SLOTS){const id=build&&build[sl];if(!id||!attAllowed(wid,id))continue;const a=ATTS[id];
    if(a.zoom){s.zoom=a.zoom;s.scope=!!a.scope;s.optic=id}
    if(a.recoil)s.recoil*=1+a.recoil;if(a.adsT)s.adsT=Math.max(.06,s.adsT+a.adsT);if(a.spread)s.hip*=1+a.spread;
    if(a.magMul)s.mag=Math.round(w.mag*a.magMul);if(a.reload)s.reload=Math.max(.6,s.reload+a.reload);
    if(a.noise)s.noise*=1+a.noise;if(a.dmg)s.dmg*=1+a.dmg;if(a.move)s.move+=a.move}
  return s}

const GEAR={
  helmet:{h0:{name:'無頭盔',tier:0,dur:0,price:0},h1:{name:'一級頭盔',tier:1,dur:20,price:2500},h2:{name:'二級戰術頭盔',tier:2,dur:30,price:6000},h3:{name:'三級防彈頭盔',tier:3,dur:40,price:14000},h4:{name:'四級重型頭盔',tier:4,dur:50,price:30000},h5:{name:'五級防爆頭盔',tier:5,dur:60,price:58000}},
  armor:{a0:{name:'無護甲',tier:0,dur:0,price:0},a1:{name:'一級防彈衣',tier:1,dur:40,price:4000},a2:{name:'二級防彈背心',tier:2,dur:60,price:9000},a3:{name:'三級戰術護甲',tier:3,dur:80,price:20000},a4:{name:'四級重型護甲',tier:4,dur:100,price:42000},a5:{name:'五級全身甲',tier:5,dur:120,price:80000}},
  rig:{rig0:{name:'簡易胸掛',cap:4,price:0},rig1:{name:'戰術胸掛',cap:8,price:6000},rig2:{name:'突擊胸掛',cap:12,price:16000}},
  bag:{bag0:{name:'無背包',cap:0,price:0},bag1:{name:'小型背包',cap:12,price:3000},bag2:{name:'中型背包',cap:20,price:9000},bag3:{name:'大型登山包',cap:32,price:22000}},
  pouch:{pouch0:{name:'基本彈掛',mul:1,price:0},pouch1:{name:'戰術彈掛',mul:1.6,price:7000},pouch2:{name:'重型彈掛',mul:2.4,price:18000}},
  safe:{safe1:{name:'基礎保險箱',cap:2,price:0},safe2:{name:'進階保險箱',cap:4,price:45000},safe3:{name:'精英保險箱',cap:6,price:110000},safe4:{name:'頂級保險箱',cap:9,price:240000}},
};
const TIER_PROT=[0,.2,.32,.44,.55,.65];
const RARITY=['#d8d0bf','#8fd17a','#6db5ff','#c08cff','#ffc94d','#ff5a48','#ff3df0'];
const ITEMS={
  // valuables
  tape:{name:'電工膠帶',v:900,s:1,r:0},phone:{name:'舊型手機',v:1800,s:1,r:0},parts:{name:'電子零件',v:2600,s:1,r:0},cig:{name:'整條香菸',v:1500,s:1,r:0},
  battery:{name:'軍用電池',v:4800,s:1,r:1},radio:{name:'軍用電台',v:7200,s:2,r:1},whisky:{name:'陳年威士忌',v:6000,s:1,r:1},
  usb:{name:'加密隨身碟',v:9500,s:1,r:2},gpu:{name:'顯示卡',v:14000,s:2,r:2},camera:{name:'專業相機',v:12500,s:2,r:2},
  tablet:{name:'戰術平板',v:16800,s:2,r:3},watch:{name:'金色懷錶',v:22000,s:1,r:3},drone:{name:'偵察無人機',v:28000,s:4,r:3},
  gold:{name:'金條',v:34000,s:1,r:4},server:{name:'伺服器主機板',v:45000,s:4,r:4},statue:{name:'青銅雕像',v:52000,s:4,r:4},
  hdd:{name:'機密硬碟',v:72000,s:1,r:5},reactor:{name:'微型反應爐',v:120000,s:4,r:5},
  core:{name:'藍晶核心',v:220000,s:1,r:6},
  // consumables & tools
  med:{name:'急救包',v:800,s:1,r:0,use:'med',heal:45,time:2.4},
  surg:{name:'手術包',v:3500,s:2,r:2,use:'med',heal:100,time:4.5},
  nade:{name:'破片手榴彈',v:1200,s:1,r:0,use:'nade'},
  repair:{name:'護甲維修包',v:2500,s:1,r:1,use:'repair',time:3},
  flare:{name:'信號彈',v:6000,s:1,r:3,use:'flare'},
  keyR:{name:'紅色鑰匙卡',v:25000,s:1,r:4,key:'R'},
  keyB:{name:'藍色鑰匙卡',v:15000,s:1,r:3,key:'B'},
};
const VALUABLES=Object.keys(ITEMS).filter(k=>!ITEMS[k].use&&!ITEMS[k].key);

const OPERATORS={
  gale:{name:'疾風',role:'突擊',color:'#ffb547',desc:'快速突入、清點',
    s1:{name:'腎上腺素',cd:22,desc:'6 秒內移動速度 +35%，換彈速度 +30%'},
    s2:{name:'震撼彈',cd:30,desc:'投擲震撼彈，9 公尺內敵人暈眩 3.5 秒'},
    s3:{name:'蜂群無人機',desc:'放出 8 架自爆無人機，追蹤 45 公尺內的敵人'}},
  owl:{name:'夜鴞',role:'偵察',color:'#72c8f5',desc:'掌握敵人位置',
    s1:{name:'心跳感測',cd:20,desc:'6 秒內標出 35 公尺內的所有敵人'},
    s2:{name:'偵察飛鏢',cd:28,desc:'投出感測器，12 秒內持續標出 25 公尺內的敵人'},
    s3:{name:'全域掃描',desc:'8 秒內標出全地圖敵人，並造成額外 20% 傷害'}},
  bulwark:{name:'壁壘',role:'重裝',color:'#c9a57a',desc:'正面硬吃火力',
    s1:{name:'緊急裝甲',cd:26,desc:'立即修復 50 點護甲耐久'},
    s2:{name:'部署護盾',cd:32,desc:'在前方架起可擋子彈的護盾牆，持續 25 秒'},
    s3:{name:'火箭齊射',desc:'標定準星位置，6 枚火箭在 2 秒內轟炸'}},
  heron:{name:'白鷺',role:'醫療',color:'#72f5a8',desc:'續航與救援',
    s1:{name:'治療脈衝',cd:20,desc:'3 秒內為自己與 10 公尺內隊友恢復 35 生命'},
    s2:{name:'煙霧彈',cd:26,desc:'投出煙霧，遮蔽視線 14 秒'},
    s3:{name:'守護無人機',desc:'6 秒無敵並回滿生命，救起 15 公尺內倒地的隊友'}},
};

/* ================= maps meta ================= */
const MAPS={
  town:{name:'灰區鎮',half:165,desc:'街區、指揮所、銀行金庫、滑索與屋頂狙擊。',size:'330 × 330 m'},
  harbor:{name:'鐵鏽港',half:190,desc:'貨櫃迷宮、吊臂電梯、貨輪甲板、伺服器機房。',size:'380 × 380 m'},
  frost:{name:'寒脊研究站',half:175,desc:'雪林、岩脊、毒氣實驗室、地堡與探照燈。',size:'350 × 350 m'},
  dam:{name:'斷河水壩',half:180,desc:'峽谷河道、三座大橋、水壩頂、發電廠與森林。',size:'360 × 360 m'},
  warehouse:{name:'沙暴倉庫',half:62,desc:'近距離巷戰：大倉庫、天橋、跳板。適合對決與團戰。',size:'124 × 124 m'},
};
const MODES={
  extract:{name:'烽火撤離',tag:'搜刮 · 撤離',desc:'搜物資、打守軍，活著撤離才能帶走。裝備會遺失。',solo:true},
  conquest:{name:'全面戰場',tag:'據點 · 兵力',desc:'兩軍搶 5 個據點，扣光敵方兵力獲勝。',team:true,respawn:true},
  tdm:{name:'團隊死鬥',tag:'團隊 · 對戰',desc:'藍紅兩隊對打，先拿到 50 殺的隊伍獲勝。可以和朋友互打。',team:true,respawn:true,pvp:true},
  relic:{name:'奪取聖物',tag:'團隊 · 搶奪',desc:'搶中央的聖物帶回自家基地，先得 5 分獲勝。',team:true,respawn:true,pvp:true},
  zombie:{name:'殭屍圍城',tag:'特殊 · 合作',desc:'守住據點撐過 10 波屍潮。手槍爆頭傷害 ×3，子彈無限。',special:true,pistolFriendly:true},
  oitc:{name:'一發入魂',tag:'特殊 · 手槍',desc:'所有人只有一顆子彈，一發必死。擊殺補一發，先 15 殺獲勝。',special:true,ffa:true,respawn:true,pistolFriendly:true},
  gungame:{name:'槍王之王',tag:'特殊 · 個人',desc:'每殺一人換下一把槍，最後用刀擊殺就贏。被刀殺會降級。',special:true,ffa:true,respawn:true},
  duel:{name:'西部對決',tag:'特殊 · 手槍',desc:'手槍一對一回合制，倒數後拔槍，先贏 5 回合。',special:true,pistolFriendly:true},
};
const MUTATORS={lowgrav:'低重力',bighead:'巨頭',headonly:'只限爆頭',infammo:'無限彈藥',pistolonly:'只用手槍',hardcore:'一擊必殺'};
const GUNGAME=['l60','m7','kv47','v9','k12','d14','r90','d50','p9','knife'];
const BOT_NAMES=['獵鷹','灰狼','夜梟','鐵砧','山貓','禿鷲','黑蛇','雷鳥','野狗','銀狐','赤蠍','冰熊','鬣狗','青隼','石虎','獨角','孤鷹','蒼狼','暗鴉','火蟻'];
const botName=id=>BOT_NAMES[id%BOT_NAMES.length]+(10+(id*7)%90);
const DEFAULT_PRESETS=[{name:'A 突擊',p1:'m7',p2:null,pistol:'p9'},{name:'B 狙擊',p1:'r90',p2:'v9',pistol:'p9'},{name:'C 近戰',p1:'k12',p2:null,pistol:'d50'}];
const DIFFS={easy:{name:'簡單',acc:.55,dmg:.6,react:.35,squad:1.6,heavy:.08,tier:1,loot:1},normal:{name:'普通',acc:.85,dmg:.9,react:0,squad:1,heavy:.15,tier:2,loot:1.15},hard:{name:'困難',acc:1.05,dmg:1.15,react:-.12,squad:.8,heavy:.25,tier:3,loot:1.35},hell:{name:'地獄',acc:1.3,dmg:1.45,react:-.22,squad:.6,heavy:.35,tier:4,loot:1.6}};

/* ================= profile (stash / money) ================= */
const PF_KEY='gz2Profile';
function defaultProfile(){return{
  v:1,money:60000,
  weapons:{m7:1,v9:1},
  atts:{rd:1},
  gear:{h1:2,a1:2,a2:1,rig1:1,bag1:2,pouch0:1,rig0:1},
  stash:{med:5,nade:3,repair:1},
  ammo:{'556':400,'9mm':400,'762':60,'12g':24,'338':10,'50ae':0},
  builds:{m7:{optic:'rd'}},
  safe:'safe1',
  loadout:{p1:'m7',p2:null,pistol:'p9',helmet:'h1',armor:'a1',rig:'rig1',bag:'bag1',pouch:'pouch0',meds:3,nades:2},
  operator:'gale',
  nick:'',
  settings:{sens:1.2,adsSens:1,vol:.75,fov:78,quality:'auto',adsMode:'toggle',hitSnd:true,killVoice:true,fps:false,killcam:true,tod:'day',diff:'normal',count:'mid',time:'20',map:'town',mode:'extract',mut:[],ff:false,pickup:true,pub:true},
  presets:JSON.parse(JSON.stringify(DEFAULT_PRESETS)),preset:0,
  stats:{raids:0,extracts:0,kills:0,best:0},
}}
let PF=defaultProfile();
try{const s=JSON.parse(localStorage.getItem(PF_KEY)||'null');if(s&&s.v===1)PF=Object.assign(defaultProfile(),s,{settings:Object.assign(defaultProfile().settings,s.settings||{}),loadout:Object.assign(defaultProfile().loadout,s.loadout||{})})}catch(e){}
function savePF(){try{localStorage.setItem(PF_KEY,JSON.stringify(PF))}catch(e){}}
const fmt=v=>'$'+Math.round(v).toLocaleString();
function gearDef(kind,id){return GEAR[kind][id]}
function ownCount(cat,id){return (PF[cat]&&PF[cat][id])||0}
function addOwn(cat,id,n=1){PF[cat][id]=(PF[cat][id]||0)+n;if(PF[cat][id]<=0)delete PF[cat][id]}
