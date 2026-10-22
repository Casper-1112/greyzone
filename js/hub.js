'use strict';
/* ================= hub: deploy / stash / gunsmith / shop / operators / net / help ================= */
const Hub={tab:'deploy',shopCat:'weapons',gsW:null};
const TABS=[['deploy','出擊'],['stash','倉庫'],['gun','改槍台'],['shop','商店'],['ops','探員'],['net','連線'],['set','設定'],['help','說明']];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function h(tag,attrs={},...kids){const e=document.createElement(tag);for(const k in attrs){if(k==='on')for(const ev in attrs.on)e.addEventListener(ev,attrs.on[ev]);else if(k==='html')e.innerHTML=attrs[k];else if(k==='text')e.textContent=attrs[k];else if(attrs[k]!==false&&attrs[k]!=null)e.setAttribute(k,attrs[k])}for(const c of kids)if(c!=null)e.append(c);return e}
function sec(title,...kids){return h('div',{class:'sec'},h('h2',{text:title}),...kids)}
function seg(cur,opts,onPick){const d=h('div',{class:'seg'});for(const [v,l] of opts)d.append(h('button',{type:'button','aria-pressed':String(v===cur),text:l,on:{click:()=>{onPick(v);Hub.render()}}}));return d}
Hub.render=function(){$('money').textContent=fmt(PF.money);const tabs=$('tabs');tabs.innerHTML='';
  for(const [id,l] of TABS)tabs.append(h('button',{type:'button',role:'tab','aria-selected':String(Hub.tab===id),text:l,on:{click:()=>{Hub.tab=id;Hub.render()}}}));
  const p=$('panel');p.innerHTML='';p.scrollTop=0;({deploy:tabDeploy,stash:tabStash,gun:tabGun,shop:tabShop,ops:tabOps,net:tabNet,set:tabSettings,help:tabHelp})[Hub.tab](p);
  if(Hub.tab!=='gun')gsStop()};
const S_=()=>PF.settings;
function setSetting(k,v){S_()[k]=v;savePF();if(k==='map'||k==='tod'){hubWorld()}}
function hubWorld(){newWorld(S_().map,4242,'extract');applyTOD(S_().tod)}

/* ---------- deploy ---------- */
function loadoutProblems(){const lo=PF.loadout,pr=[];const need={};const cnt=(c,id)=>{need[c+id]=(need[c+id]||0)+1;return need[c+id]};
  for(const k of ['p1','p2']){const w=lo[k];if(w&&cnt('weapons',w)>ownCount('weapons',w))pr.push(`${WEAPONS[w].name} 數量不足`)}
  if(lo.pistol&&!WEAPONS[lo.pistol].free&&ownCount('weapons',lo.pistol)<1)pr.push(`${WEAPONS[lo.pistol].name} 不在倉庫`);
  for(const [k,id] of [['helmet',lo.helmet],['armor',lo.armor],['rig',lo.rig],['bag',lo.bag],['pouch',lo.pouch]])if(GEAR[k][id].price>0&&ownCount('gear',id)<1)pr.push(`${GEAR[k][id].name} 不在倉庫`);
  return pr}
function fixLoadout(){const lo=PF.loadout;const pr=loadoutProblems();if(!pr.length)return;
  const used={};const ok=w=>{if(!w)return true;if(WEAPONS[w].free)return true;used[w]=(used[w]||0)+1;return used[w]<=ownCount('weapons',w)};
  if(!ok(lo.p1))lo.p1=null;if(!ok(lo.p2))lo.p2=null;if(lo.pistol&&!WEAPONS[lo.pistol].free&&ownCount('weapons',lo.pistol)<1)lo.pistol='p9';
  const base={helmet:'h0',armor:'a0',rig:'rig0',bag:'bag0',pouch:'pouch0'};for(const k in base)if(GEAR[k][lo[k]].price>0&&ownCount('gear',lo[k])<1)lo[k]=base[k];savePF()}
function tabDeploy(p){const st=S_();const inRoom=NET.status==='hosting'||NET.status==='joined';const isClient=inRoom&&!NET.isHost;
  if(isClient&&NET.hostSet){const hs=NET.hostSet;p.append(sec('房主設定',h('div',{class:'chips'},h('span',{class:'chip',text:MODES[hs.mode].name}),h('span',{class:'chip',text:MAPS[hs.map].name}),h('span',{class:'chip',text:DIFFS[hs.diff].name}),...(hs.mut||[]).map(m=>h('span',{class:'chip',text:MUTATORS[m]}))),h('p',{class:'hint',text:'模式和地圖由房主決定。你可以先調整自己的配裝與探員。'})))}
  else{
  const mg=h('div',{id:'modeGrid'});for(const id in MODES){const m=MODES[id];mg.append(h('button',{class:'mcard'+(m.pistolFriendly?' pf':''),type:'button','aria-pressed':String(st.mode===id),on:{click:()=>{setSetting('mode',id);if(id==='duel'&&st.map!=='warehouse')setSetting('map','warehouse');Hub.render()}}},
    h('span',{class:'tg',text:m.tag+(m.pistolFriendly?' · 手槍友善':'')}),h('b',{text:m.name}),h('small',{text:m.desc})))}
  p.append(sec('1　選模式',mg));
  p.append(sec('2　選地圖',h('div',{class:'cards'},...Object.entries(MAPS).map(([id,m])=>h('button',{class:'card',type:'button','aria-pressed':String(st.map===id),on:{click:()=>{setSetting('map',id);Hub.render()}}},h('b',{text:m.name}),h('small',{text:m.size+' · '+m.desc}))))));
  const mut=h('div',{class:'chips'});for(const k in MUTATORS){const on=st.mut.includes(k);mut.append(h('button',{type:'button',class:'chip tog','aria-pressed':String(on),text:MUTATORS[k],on:{click:()=>{st.mut=on?st.mut.filter(x=>x!==k):[...st.mut,k];savePF();Hub.render()}}}))}
  p.append(sec('3　趣味規則（可複選）',mut,h('p',{class:'hint',style:'margin:0',text:'「只用手槍」配「一擊必殺」或「巨頭」最刺激。低重力可以跳上屋頂。'})));
  const s=h('div',{class:'settings'});
  s.append(h('span',{text:'難度'}),seg(st.diff,Object.entries(DIFFS).map(([k,v])=>[k,v.name]),v=>setSetting('diff',v)));
  s.append(h('span',{text:MODES[st.mode].team?'每隊人數':'敵人數量'}),seg(st.count,[['few','少'],['mid','中'],['many','多'],['max','爆量']],v=>setSetting('count',v)));
  s.append(h('span',{text:'時限'}),seg(st.time,[['10','10 分'],['15','15 分'],['20','20 分'],['30','30 分']],v=>setSetting('time',v)));
  s.append(h('span',{text:'時段'}),seg(st.tod,[['day','白天'],['dusk','黃昏'],['night','夜戰']],v=>setSetting('tod',v)));
  p.append(h('details',{class:'adv',open:Hub.advOpen?'':null,on:{toggle:e=>{Hub.advOpen=e.target.open}}},h('summary',{text:`進階：${DIFFS[st.diff].name} · ${({few:'少',mid:'中',many:'多',max:'爆量'})[st.count]} · ${st.time} 分 · ${({day:'白天',dusk:'黃昏',night:'夜戰'})[st.tod]}`}),h('div',{style:'margin-top:10px'},s)))}
  const op=OPERATORS[PF.operator];
  p.append(sec('探員',h('div',{class:'lrow'},h('span',{class:'lbl',text:op.role}),h('b',{text:op.name+'　'+op.s1.name+' / '+op.s2.name+' / '+op.s3.name}),h('button',{class:'mini',type:'button',text:'更換',on:{click:()=>{Hub.tab='ops';Hub.render()}}}))));
  const mode=isClient&&NET.hostSet?NET.hostSet.mode:st.mode;
  if(mode==='extract'){fixLoadout();const lo=PF.loadout;const pr=loadoutProblems();
    const items=[['主武器',lo.p1?WEAPONS[lo.p1].name:'無'],['副武器',lo.p2?WEAPONS[lo.p2].name:'無'],['手槍',WEAPONS[lo.pistol||'p9'].name],['頭盔',GEAR.helmet[lo.helmet].name],['護甲',GEAR.armor[lo.armor].name],['背包',GEAR.bag[lo.bag].name],['保險箱',GEAR.safe[PF.safe].cap+' 格']];
    const box=h('div',{class:'chips'});for(const [k,v] of items)box.append(h('span',{class:'chip',text:k+'：'+v}));
    p.append(sec('攜帶裝備（陣亡會遺失）',box,h('div',{class:'btns'},h('button',{class:'mini',type:'button',text:'到倉庫調整',on:{click:()=>{Hub.tab='stash';Hub.render()}}})),pr.length?h('p',{class:'warn',text:pr.join('、')}):null))}
  else if(mode==='conquest'||mode==='tdm'||mode==='relic'||mode==='zombie'){const g=h('div',{class:'cards'});PF.presets.forEach((pr,i)=>g.append(h('button',{class:'card',type:'button','aria-pressed':String(PF.preset===i),on:{click:()=>{PF.preset=i;savePF();Hub.render()}}},h('b',{text:pr.name}),h('small',{text:[pr.p1,pr.p2,pr.pistol].filter(Boolean).map(w=>WEAPONS[w].name).join(' · ')}))));
    p.append(sec('配裝（免費，不會遺失 · 戰鬥中按 F1–F3 切換）',g,h('div',{class:'btns'},h('button',{class:'mini',type:'button',text:'編輯配裝',on:{click:()=>{Hub.tab='stash';Hub.render()}}}))))}
  else p.append(sec('配裝',h('p',{class:'hint',text:mode==='duel'?`西部對決只能用手槍（目前：${WEAPONS[PF.loadout.pistol||'p9'].name}，可到倉庫更換）。`:mode==='oitc'?'一發入魂統一配發 D50 手槍與戰術刀。':'槍王之王會依擊殺自動換槍。'})));
  const sm=isClient&&NET.hostSet?NET.hostSet:st;
  const btn=h('button',{class:'go',type:'button',text:inRoom?(NET.isHost?'開始連線對局':'等待房主開始'):'出擊'});if(isClient)btn.disabled=true;
  btn.onclick=()=>{initAudio();const cfg={mode:st.mode,map:st.map,diff:st.diff,tod:st.tod,time:st.time,count:st.count,mut:st.mut.slice(),seed:(Math.random()*1e9)|0,spawnIdx:Math.random()*4|0,tickets:{10:150,15:200,20:260,30:350}[st.time],room:{ff:!!st.ff,pickup:st.pickup!==false,killcam:st.killcam!==false}};
    if(inRoom&&NET.isHost)netStartGame(cfg);else startMatch(cfg)};
  p.append(h('div',{id:'deployBar'},h('div',{class:'sum',text:`${MODES[sm.mode].name} · ${MAPS[sm.map].name} · ${DIFFS[sm.diff].name}${(sm.mut||[]).length?' · '+sm.mut.map(m=>MUTATORS[m]).join('、'):''}${inRoom?` · 房間 ${NET.code}（${Object.keys(NET.members).length} 人）`:''}`}),btn))}

/* ---------- stash ---------- */
function tabStash(p){const lo=PF.loadout;fixLoadout();
  {const all=Object.keys(WEAPONS);const longs=all.filter(w=>WEAPONS[w].slot==='long'),pis=all.filter(w=>WEAPONS[w].slot==='pistol');const box=h('div',{class:'list'});
   PF.presets.forEach((pr,i)=>{const mk=(key,list,none)=>{const sl=h('select');if(none)sl.append(h('option',{value:'',text:'無'}));for(const w of list){const o=h('option',{value:w,text:WEAPONS[w].name});if(pr[key]===w)o.selected=true;sl.append(o)}sl.onchange=()=>{pr[key]=sl.value||null;savePF()};return sl};
     box.append(h('div',{class:'lrow',style:'grid-template-columns:70px 1fr 1fr 1fr'},h('b',{text:pr.name}),mk('p1',longs,true),mk('p2',longs,true),mk('pistol',pis,false)))});
   p.append(sec('重生模式配裝 A / B / C（全面戰場、團隊死鬥、奪取聖物、殭屍圍城使用，免費不會遺失）',box))}
  const sel=(label,cur,opts,onChange,meta)=>{const s=h('select');for(const [v,l] of opts){const o=h('option',{value:v,text:l});if(v===(cur||''))o.selected=true;s.append(o)}s.onchange=()=>{onChange(s.value||null);savePF();Hub.render()};return h('div',{class:'lrow'},h('span',{class:'lbl',text:label}),s,h('span',{class:'meta',text:meta||''}))};
  const longs=Object.keys(WEAPONS).filter(w=>WEAPONS[w].slot==='long'&&ownCount('weapons',w)>0);
  const wopts=[['','無'],...longs.map(w=>[w,`${WEAPONS[w].name}（擁有 ${ownCount('weapons',w)}）`])];
  const pist=[['p9',WEAPONS.p9.name+'（免費）'],...Object.keys(WEAPONS).filter(w=>WEAPONS[w].slot==='pistol'&&!WEAPONS[w].free&&ownCount('weapons',w)>0).map(w=>[w,WEAPONS[w].name])];
  const gopts=k=>Object.entries(GEAR[k]).filter(([id,g])=>g.price===0||ownCount('gear',id)>0).map(([id,g])=>[id,g.name+(g.price?`（擁有 ${ownCount('gear',id)}）`:'')]);
  const box=h('div',{class:'list'});
  box.append(sel('主武器',lo.p1,wopts,v=>lo.p1=v,lo.p1?WEAPONS[lo.p1].cls:''));box.append(sel('副武器',lo.p2,wopts,v=>lo.p2=v,lo.p2?WEAPONS[lo.p2].cls:''));box.append(sel('手槍',lo.pistol,pist,v=>lo.pistol=v||'p9'));
  box.append(sel('頭盔',lo.helmet,gopts('helmet'),v=>lo.helmet=v,`${GEAR.helmet[lo.helmet].tier} 級`));box.append(sel('護甲',lo.armor,gopts('armor'),v=>lo.armor=v,`${GEAR.armor[lo.armor].tier} 級 · 耐久 ${GEAR.armor[lo.armor].dur}`));
  box.append(sel('胸掛',lo.rig,gopts('rig'),v=>lo.rig=v,`${GEAR.rig[lo.rig].cap} 格`));box.append(sel('背包',lo.bag,gopts('bag'),v=>lo.bag=v,`${GEAR.bag[lo.bag].cap} 格`));
  box.append(sel('彈掛',lo.pouch,gopts('pouch'),v=>lo.pouch=v,`彈藥上限 ×${GEAR.pouch[lo.pouch].mul}`));
  box.append(h('div',{class:'lrow'},h('span',{class:'lbl',text:'保險箱'}),h('b',{text:GEAR.safe[PF.safe].name}),h('span',{class:'meta',text:GEAR.safe[PF.safe].cap+' 格 · 商店升級'})));
  const step=(label,key,stashId,max)=>{const v=Math.min(lo[key]||0,ownCount('stash',stashId));lo[key]=v;return h('div',{class:'lrow'},h('span',{class:'lbl',text:label}),h('div',{class:'stepper'},
      h('button',{class:'mini',type:'button',text:'−',on:{click:()=>{lo[key]=Math.max(0,v-1);savePF();Hub.render()}}}),h('b',{text:String(v)}),h('button',{class:'mini',type:'button',text:'＋',on:{click:()=>{lo[key]=Math.min(max,ownCount('stash',stashId),v+1);savePF();Hub.render()}}})),h('span',{class:'meta',text:`倉庫 ${ownCount('stash',stashId)}`}))};
  box.append(step('急救包','meds','med',8),step('手榴彈','nades','nade',6));
  const tog=(label,key,id)=>{const c=h('input',{type:'checkbox'});c.checked=!!lo[key];c.onchange=()=>{lo[key]=c.checked;savePF()};return h('label',{class:'lrow',style:'cursor:pointer'},h('span',{class:'lbl',text:label}),c,h('span',{class:'meta',text:id.map(i=>`${ITEMS[i].name} ${ownCount('stash',i)}`).join(' · ')}))};
  box.append(tog('維修包','repair',['repair']),tog('鑰匙卡','keys',['keyR','keyB']),tog('信號彈','flare',['flare']));
  p.append(sec('出擊配裝',box,h('p',{class:'hint',text:'所選的槍枝與裝備會從倉庫帶出；成功撤離會連同戰利品帶回，陣亡則遺失（P9 手槍與基礎裝備除外）。'})));
  // stash contents
  const vals=Object.keys(PF.stash).filter(id=>ITEMS[id]&&!ITEMS[id].use&&!ITEMS[id].key&&PF.stash[id]>0).sort((a,b)=>ITEMS[b].v-ITEMS[a].v);
  const total=vals.reduce((s,id)=>s+ITEMS[id].v*PF.stash[id],0);
  const vl=h('div',{class:'list'});for(const id of vals){const it=ITEMS[id],n=PF.stash[id];vl.append(h('div',{class:'item'},h('span',{},h('span',{style:`color:${RARITY[it.r]}`,text:`${it.name} ×${n}`}),h('small',{text:`單價 ${fmt(it.v)} · ${it.s} 格`})),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('stash',id,1,it.v)}}),h('button',{type:'button',text:`全賣 ${fmt(it.v*n)}`,on:{click:()=>sell('stash',id,n,it.v)}})))}
  p.append(sec(`收藏品（總值 ${fmt(total)}）`,vals.length?vl:h('p',{class:'hint',text:'還沒有收藏品。出擊撤離後，帶回的物資會出現在這裡。'}),vals.length?h('div',{class:'btns'},h('button',{class:'go',type:'button',text:`一鍵出售全部 ${fmt(total)}`,on:{click:()=>{for(const id of vals){PF.money+=ITEMS[id].v*PF.stash[id];delete PF.stash[id]}savePF();blip(880,.1,'square',.05);Hub.render()}}})):null));
  const cons=Object.keys(PF.stash).filter(id=>ITEMS[id]&&(ITEMS[id].use||ITEMS[id].key)&&PF.stash[id]>0);const cl=h('div',{class:'list'});
  for(const id of cons){const it=ITEMS[id];cl.append(h('div',{class:'item'},h('span',{text:`${it.name} ×${PF.stash[id]}`}),h('span',{class:'price',text:fmt(Math.round(it.v*.5))}),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('stash',id,1,Math.round(it.v*.5))}})))}
  p.append(sec('消耗品與鑰匙卡',cons.length?cl:h('p',{class:'hint',text:'沒有消耗品。'})));
  const am=h('div',{class:'chips'});for(const k in AMMO)am.append(h('span',{class:'chip',text:`${AMMO[k].name} ${PF.ammo[k]||0}`}));p.append(sec('彈藥庫存',am));
  const gl=h('div',{class:'list'});for(const w in PF.weapons)if(PF.weapons[w]>0)gl.append(h('div',{class:'item'},h('span',{text:`${WEAPONS[w].name} ×${PF.weapons[w]}`}),h('span',{class:'price',text:fmt(WEAPONS[w].price*.5)}),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('weapons',w,1,WEAPONS[w].price*.5)}})));
  for(const id in PF.gear){const k=Object.keys(GEAR).find(k=>GEAR[k][id]);if(!k||PF.gear[id]<=0)continue;const g=GEAR[k][id];gl.append(h('div',{class:'item'},h('span',{text:`${g.name} ×${PF.gear[id]}`}),h('span',{class:'price',text:fmt(g.price*.5)}),h('button',{type:'button',text:'賣 1',on:{click:()=>sell('gear',id,1,g.price*.5)}})))}
  p.append(sec('槍枝與裝備',gl))}
function sell(cat,id,n,price){addOwn(cat,id,-n);PF.money+=price*n;savePF();blip(880,.08,'square',.05);Hub.render()}

/* ---------- gunsmith ---------- */
let gsR=null,gsScene=null,gsCam=null,gsModel=null,gsRAF=0;
function gsStart(){const c=$('gsPrev');if(!c)return;if(!gsR){gsR=new T.WebGLRenderer({canvas:c,antialias:true,alpha:true});gsScene=new T.Scene();gsScene.add(new T.HemisphereLight(0xfff1dc,0x3a3024,1.1));const l=new T.DirectionalLight(0xffe0b0,1.2);l.position.set(1,2,1.5);gsScene.add(l);gsCam=new T.PerspectiveCamera(30,16/10,.01,10);gsCam.position.set(-.55,.18,.55);gsCam.lookAt(0,0,-.2);gsR.outputEncoding=T.sRGBEncoding}
  else if(gsR.domElement!==c){gsR.dispose();gsR=null;return gsStart()}
  const w=c.clientWidth,hh=c.clientHeight;gsR.setPixelRatio(Math.min(2,devicePixelRatio));gsR.setSize(w,hh,false);gsCam.aspect=w/hh;gsCam.updateProjectionMatrix();
  cancelAnimationFrame(gsRAF);const tick=t=>{if(!$('gsPrev')){gsRAF=0;return}if(gsModel)gsModel.rotation.y=Math.sin(t/1600)*.5+.3;gsR.render(gsScene,gsCam);gsRAF=requestAnimationFrame(tick)};gsRAF=requestAnimationFrame(tick)}
function gsStop(){cancelAnimationFrame(gsRAF);gsRAF=0;if(gsR){gsR.dispose();gsR=null}}
function gsSetModel(wid){if(!gsScene)return;if(gsModel)gsScene.remove(gsModel);const vm=buildVM(wid,PF.builds[wid]||{},true);gsModel=new T.Group();vm.g.visible=true;vm.g.position.set(0,0,.2);gsModel.add(vm.g);
  const S=VMSPEC[WEAPONS[wid].model];const len=S.pistol?.35:1;gsModel.scale.setScalar(S.pistol?1.9:1);gsScene.add(gsModel)}
function tabGun(p){const owned=Object.keys(WEAPONS).filter(w=>WEAPONS[w].free||ownCount('weapons',w)>0);if(!Hub.gsW||!owned.includes(Hub.gsW))Hub.gsW=owned[0];const wid=Hub.gsW;
  p.append(sec('選擇槍枝',seg(wid,owned.map(w=>[w,WEAPONS[w].name]),v=>{Hub.gsW=v})));
  const build=PF.builds[wid]||(PF.builds[wid]={});const st=weaponStats(wid,build),base=weaponStats(wid,{});const w=WEAPONS[wid];
  const stats=h('div',{class:'list'});const bar=(l,v,max,txt,better)=>h('div',{class:'stat'},h('span',{text:l}),h('div',{class:'meter'},h('div',{style:`width:${clamp(v/max,0,1)*100}%`})),h('b',{text:txt,style:better===true?'color:var(--exfil)':better===false?'color:var(--danger)':''}));
  const cmp=(a,b,hi)=>a===b?null:(hi?a>b:a<b);
  stats.append(bar('傷害',st.dmg*(w.pel||1),130,String(Math.round(st.dmg))+(w.pel?'×'+w.pel:''),cmp(st.dmg,base.dmg,true)),bar('射速',st.rpm,950,st.rpm+' rpm'),bar('彈容',st.mag,100,String(st.mag),cmp(st.mag,base.mag,true)),
    bar('穩定',.08-st.recoil,.08,Math.round((1-st.recoil/.07)*100)+'',cmp(st.recoil,base.recoil,false)),bar('腰射',.09-st.hip,.09,Math.round((1-st.hip/.09)*100)+'',cmp(st.hip,base.hip,false)),
    bar('開鏡',.4-st.adsT,.4,st.adsT.toFixed(2)+' s',cmp(st.adsT,base.adsT,false)),bar('倍率',st.zoom,8,st.zoom.toFixed(2)+'×',cmp(st.zoom,base.zoom,true)),bar('換彈',5-st.reload,5,st.reload.toFixed(1)+' s',cmp(st.reload,base.reload,false)),bar('噪音',80-st.noise,80,Math.round(st.noise)+' m',cmp(st.noise,base.noise,false)));
  p.append(h('div',{class:'gs'},h('canvas',{id:'gsPrev'}),h('div',{},h('div',{style:'font-family:var(--f-disp);font-weight:800;font-size:24px',text:w.name}),h('div',{class:'hint',text:`${w.cls} · ${AMMO[w.ammo].name}`}),stats)));
  for(const sl of ATT_SLOTS){const opts=Object.keys(ATTS).filter(a=>ATTS[a].slot===sl&&attAllowed(wid,a));if(!opts.length)continue;const row=h('div',{class:'list'});
    const cur=build[sl]||null;
    row.append(h('div',{class:'item'},h('span',{text:'無'+(sl==='optic'?'（機械瞄具）':'')}),h('span'),h('button',{type:'button',text:cur?'卸下':'使用中',disabled:cur?null:'',on:{click:()=>{delete build[sl];savePF();Hub.render()}}})));
    for(const a of opts){const A=ATTS[a],own=ownCount('atts',a)>0;
      row.append(h('div',{class:'item'},h('span',{},h('span',{text:A.name}),h('small',{text:A.desc})),h('span',{class:'price',text:own?'已擁有':fmt(A.price)}),
        h('button',{type:'button',text:cur===a?'使用中':own?'裝上':'購買並裝上',disabled:cur===a||(!own&&PF.money<A.price)?'':null,on:{click:()=>{if(!own){if(PF.money<A.price)return;PF.money-=A.price;addOwn('atts',a,1);blip(880,.08,'square',.05)}build[sl]=a;savePF();Hub.render()}}})))}
    p.append(sec(ATT_SLOT_NAME[sl],row))}
  p.append(h('p',{class:'hint',text:'配件購買後永久解鎖，可以裝在所有相容的槍上。改裝會套用到這把槍的所有出擊。'}));
  requestAnimationFrame(()=>{gsStart();gsSetModel(wid)})}

/* ---------- shop ---------- */
function tabShop(p){const cats=[['weapons','槍枝'],['atts','配件'],['armor','頭盔護甲'],['gear','胸掛背包彈掛'],['cons','彈藥消耗品'],['safe','保險箱'],['sell','出售']];
  p.append(seg(Hub.shopCat,cats,v=>{Hub.shopCat=v}));const L=h('div',{class:'list',style:'margin-top:12px'});p.append(L);
  const row=(name,desc,price,owned,onBuy,label='購買')=>L.append(h('div',{class:'item'},h('span',{},h('span',{text:name}),h('small',{text:desc})),h('span',{class:'price',text:fmt(price)+(owned!=null?` · 擁有 ${owned}`:'')}),h('button',{type:'button',text:label,disabled:PF.money<price?'':null,on:{click:()=>{if(PF.money<price)return;PF.money-=price;onBuy();savePF();blip(880,.08,'square',.05);Hub.render()}}})));
  switch(Hub.shopCat){
  case 'weapons':for(const w in WEAPONS){const d=WEAPONS[w];if(d.free)continue;row(d.name,`${d.cls} · 傷害 ${d.dmg}${d.pel?'×'+d.pel:''} · ${d.rpm} rpm · 彈匣 ${d.mag} · ${AMMO[d.ammo].name}`,d.price,ownCount('weapons',w),()=>addOwn('weapons',w,1))}break;
  case 'atts':for(const a in ATTS){const A=ATTS[a];if(ownCount('atts',a))continue;row(`${ATT_SLOT_NAME[A.slot]} · ${A.name}`,A.desc,A.price,null,()=>addOwn('atts',a,1),'解鎖')}if(!L.children.length)L.append(h('p',{class:'hint',text:'所有配件都已解鎖。'}));break;
  case 'armor':for(const k of ['helmet','armor'])for(const id in GEAR[k]){const g=GEAR[k][id];if(!g.price)continue;row(g.name,`${g.tier} 級防護 · 耐久 ${g.dur} · 減傷 ${Math.round(TIER_PROT[g.tier]*100)}%`,g.price,ownCount('gear',id),()=>addOwn('gear',id,1))}break;
  case 'gear':for(const k of ['rig','bag','pouch'])for(const id in GEAR[k]){const g=GEAR[k][id];if(!g.price)continue;row(g.name,k==='pouch'?`彈藥攜帶上限 ×${g.mul}`:`${g.cap} 格空間`,g.price,ownCount('gear',id),()=>addOwn('gear',id,1))}break;
  case 'cons':for(const c in AMMO){const n=c==='338'?10:c==='12g'?20:60;row(`${AMMO[c].name} ×${n}`,'彈藥',AMMO[c].price*n,PF.ammo[c]||0,()=>{PF.ammo[c]=(PF.ammo[c]||0)+n})}
    for(const id of ['med','surg','nade','repair','flare']){const it=ITEMS[id];row(it.name,{med:'回復 45 生命',surg:'回復全部生命',nade:'破片手榴彈',repair:'護甲耐久 +40',flare:'呼叫直升機到直升機坪撤離'}[id],Math.round(it.v*1.2),ownCount('stash',id),()=>addOwn('stash',id,1))}break;
  case 'safe':for(const id in GEAR.safe){const g=GEAR.safe[id];if(!g.price)continue;const cur=GEAR.safe[PF.safe].cap>=g.cap;L.append(h('div',{class:'item'},h('span',{},h('span',{text:g.name}),h('small',{text:`${g.cap} 格 · 陣亡時保留內容物`})),h('span',{class:'price',text:fmt(g.price)}),h('button',{type:'button',text:cur?'已擁有':'升級',disabled:cur||PF.money<g.price?'':null,on:{click:()=>{PF.money-=g.price;PF.safe=id;savePF();blip(880,.08,'square',.05);Hub.render()}}})))}break;
  case 'sell':Hub.tab='stash';Hub.render();return}}

/* ---------- operators ---------- */
function tabOps(p){const g=h('div',{class:'opgrid'});for(const id in OPERATORS){const o=OPERATORS[id];
  g.append(h('button',{class:'op',type:'button','aria-pressed':String(PF.operator===id),on:{click:()=>{PF.operator=id;savePF();Hub.render()}}},
    h('div',{},h('h3',{text:o.name,style:`color:${o.color}`}),h('div',{class:'role',text:o.role+' · '+o.desc})),
    h('p',{html:`<b>小招 Q · ${esc(o.s1.name)}</b>（冷卻 ${o.s1.cd} 秒）<br>${esc(o.s1.desc)}`}),h('p',{html:`<b>二招 Z · ${esc(o.s2.name)}</b>（冷卻 ${o.s2.cd} 秒）<br>${esc(o.s2.desc)}`}),h('p',{html:`<b>大招 X · ${esc(o.s3.name)}</b>（擊殺與時間充能）<br>${esc(o.s3.desc)}`})))}
  p.append(sec('選擇探員',g))}

/* ---------- net ---------- */
function copyText(t,btn){const ok=()=>{if(btn){const o=btn.textContent;btn.textContent='已複製';setTimeout(()=>btn.textContent=o,1200)}};try{navigator.clipboard.writeText(t).then(ok,()=>prompt?0:0)}catch(e){}}
function tabNet(p){const av=netAvailable();
  if(!av.ok)p.append(h('p',{class:'warn',text:av.why}));
  const nick=h('input',{type:'text',maxlength:'12',placeholder:'你的暱稱',value:PF.nick||''});nick.addEventListener('change',()=>{PF.nick=nick.value.trim().slice(0,12);savePF()});
  const saveNick=()=>{PF.nick=nick.value.trim().slice(0,12)||PF.nick||('玩家'+(Math.random()*900+100|0));savePF()};
  p.append(sec('暱稱',nick));
  const inRoom=NET.status!=='idle';
  if(!inRoom){
    if(Hub.joinCode){p.append(sec('受邀加入',h('div',{class:'btns'},h('button',{class:'go',type:'button',text:'加入房間 '+Hub.joinCode,disabled:av.ok?null:'',on:{click:()=>{saveNick();netCreate(false,Hub.joinCode);Hub.joinCode=null;Hub.render()}}}))))}
    const code=h('input',{type:'text',maxlength:'6',placeholder:'輸入房號',style:'text-transform:uppercase;width:140px;font-size:18px;letter-spacing:.2em'});
    p.append(sec('開房或加入',h('div',{class:'btns'},
      h('button',{class:'go',type:'button',text:'建立房間',disabled:av.ok?null:'',on:{click:()=>{saveNick();const c=Array.from({length:5},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');netCreate(true,c);Hub.render()}}}),
      code,h('button',{class:'ghost',type:'button',text:'加入',disabled:av.ok?null:'',on:{click:()=>{const c=code.value.trim().toUpperCase();if(c.length<4)return;saveNick();netCreate(false,c);Hub.render()}}}))));
    const list=h('div',{class:'list',id:'pubList'},h('p',{class:'hint',text:'按「重新整理」看看有沒有人開房。'}));
    p.append(sec('公開房間（測試功能）',h('div',{class:'btns'},h('button',{class:'mini',type:'button',text:'重新整理',disabled:av.ok?null:'',on:{click:()=>{list.innerHTML='<p class="hint">搜尋中…</p>';pubList(rows=>{list.innerHTML='';if(!rows.length){list.append(h('p',{class:'hint',text:'目前沒有公開房間。你可以自己開一間，別人重新整理就看得到。'}));return}
      for(const r of rows)list.append(h('div',{class:'item'},h('span',{},h('span',{text:`${r.host} 的房間`}),h('small',{text:`${MODES[r.mode]?MODES[r.mode].name:''} · ${MAPS[r.map]?MAPS[r.map].name:''} · ${r.n} 人${r.playing?' · 遊戲中':''}`})),h('span',{class:'price',text:r.code}),h('button',{type:'button',text:'加入',on:{click:()=>{saveNick();netCreate(false,r.code);Hub.render()}}})))})}}})),list));
    p.append(h('p',{class:'hint',text:'連線用 WebRTC 點對點，敵人由房主的電腦模擬。公開房間清單由正在玩的玩家互相轉發，人少時可能看不到，直接分享房號或邀請連結最穩。'}))}
  else{const code=h('b',{text:NET.code,style:'font-family:var(--f-num);font-size:32px;letter-spacing:.24em;color:var(--amber)'});
    const c1=h('button',{class:'mini',type:'button',text:'複製房號'});c1.onclick=()=>copyText(NET.code,c1);const c2=h('button',{class:'mini',type:'button',text:'複製邀請連結'});c2.onclick=()=>copyText(inviteLink(),c2);
    p.append(sec('房間',h('div',{style:'display:flex;gap:12px;align-items:center;flex-wrap:wrap'},code,c1,c2,h('button',{class:'mini',type:'button',text:'離開房間',on:{click:()=>{netLeave();Hub.render()}}})),h('p',{class:'hint',style:'margin:0;user-select:text',text:'邀請連結：'+inviteLink()})));
    const set=NET.isHost?lobbySettings():NET.hostSet;const teamMode=set&&MODES[set.mode]&&MODES[set.mode].team;
    if(teamMode){const me=NET.members[NET.myId]||{};p.append(sec('選隊伍',seg(me.team||1,[[1,'藍隊 ALPHA'],[2,'紅隊 BRAVO']],v=>netSetTeam(v))))}
    p.append(sec('成員',h('div',{class:'list',id:'netMembers'})));
    if(set)p.append(sec('對局設定',h('div',{class:'chips'},h('span',{class:'chip',text:MODES[set.mode].name}),h('span',{class:'chip',text:MAPS[set.map].name}),h('span',{class:'chip',text:DIFFS[set.diff].name}),...(set.mut||[]).map(m=>h('span',{class:'chip',text:MUTATORS[m]})),h('span',{class:'chip',text:'友軍傷害 '+(set.ff?'開':'關')}),h('span',{class:'chip',text:'撿武器 '+(set.pickup!==false?'開':'關')}))));
    if(NET.isHost)p.append(h('div',{class:'btns'},h('button',{class:'go',type:'button',text:'選模式並開始',on:{click:()=>{Hub.tab='deploy';Hub.render()}}}),h('button',{class:'ghost',type:'button',text:'房間設定',on:{click:()=>{Hub.tab='set';Hub.render()}}})));
    else p.append(h('p',{class:'hint',text:'等待房主開始對局。'}))}
  p.append(h('div',{class:'netstatus'+(Hub.netErr?' err':''),id:'netStatus',text:Hub.netMsg||''}));renderMembers()}
function renderMembers(){const ml=$('netMembers');if(!ml)return;ml.innerHTML='';const set=NET.isHost?lobbySettings():NET.hostSet;const teamMode=set&&MODES[set.mode]&&MODES[set.mode].team;
  for(const id in NET.members){const m=NET.members[id];ml.append(h('div',{class:'item'},h('span',{},h('span',{text:(m.host?'房主 · ':'')+m.nick+(id===NET.myId?'（你）':'')}),h('small',{text:OPERATORS[m.op]?OPERATORS[m.op].name:''})),h('span',{class:'price',style:teamMode?`color:${m.team===2?'#ff6b5e':'#72c8f5'}`:'',text:teamMode?(m.team===2?'紅隊':'藍隊'):''}),h('span')))}}
UI.netStatus=(msg,err)=>{Hub.netMsg=msg;Hub.netErr=!!err;const el=$('netStatus');if(el){el.textContent=msg;el.classList.toggle('err',!!err)}if(err&&NET.status==='connecting'){NET.status='idle';if(Hub.tab==='net'&&!M.running)Hub.render()}};
UI.netLobby=()=>{if(!M.running&&(Hub.tab==='net'||Hub.tab==='deploy'))Hub.render();else renderMembers()};

/* ---------- settings ---------- */
function tabSettings(p){const st=S_();const s=h('div',{class:'settings'});
  const slider=(label,key,min,max,step,fmtf,after)=>{const i=h('input',{type:'range',id:'set_'+key,min:String(min),max:String(max),step:String(step),value:String(st[key])});const v=h('span',{text:fmtf(st[key]),style:'font-family:var(--f-num);font-size:13px;min-width:46px'});
    i.addEventListener('input',()=>{st[key]=+i.value;v.textContent=fmtf(st[key]);savePF();after&&after()});s.append(h('label',{for:'set_'+key,text:label}),h('div',{style:'display:flex;gap:10px;align-items:center'},i,v))};
  slider('滑鼠靈敏度','sens',.2,3,.05,v=>v.toFixed(2));slider('開鏡靈敏度','adsSens',.3,2,.05,v=>'×'+v.toFixed(2));slider('音量','vol',0,1,.05,v=>Math.round(v*100)+'%',()=>{if(master)master.gain.value=st.vol});slider('視野 FOV','fov',65,100,1,v=>v+'°');
  s.append(h('span',{text:'畫質'}),seg(st.quality,[['auto','自動'],['low','低'],['mid','中'],['high','高']],v=>{st.quality=v;savePF();applyQuality()}));
  s.append(h('span',{text:'開鏡方式'}),seg(st.adsMode,[['toggle','按一下切換'],['hold','按住瞄準']],v=>{st.adsMode=v;savePF()}));
  const tog=(label,key)=>{s.append(h('span',{text:label}),seg(st[key]?1:0,[[1,'開'],[0,'關']],v=>{st[key]=!!v;savePF()}))};
  tog('命中音效','hitSnd');tog('擊殺語音','killVoice');tog('陣亡回放 KILLCAM','killcam');tog('顯示 FPS','fps');
  p.append(sec('遊戲設定',s));
  const r=h('div',{class:'settings'});const tog2=(label,key)=>{r.append(h('span',{text:label}),seg(st[key]?1:0,[[1,'開'],[0,'關']],v=>{st[key]=!!v;savePF();if(NET.isHost)netBroadcastLobby()}))};
  tog2('友軍傷害','ff');tog2('可撿地上武器','pickup');tog2('房間公開列出','pub');
  p.append(sec('房間設定（你當房主時套用）',r))}

/* ---------- help ---------- */
function tabHelp(p){p.append(sec('電腦操作',h('div',{class:'keys',html:[['WASD','移動'],['Shift','衝刺'],['Shift + C','滑鏟'],['C','蹲下（切換）'],['Space','跳躍 / 翻越矮牆 / 爬梯'],['按住 G 放開','蓄力投擲手榴彈'],['右鍵兩下','狙擊鏡第二段放大'],['F1–F3','切換重生配裝'],['Tab','背包（撤離）/ 計分板'],['Enter','連線聊天'],['左鍵','射擊'],['右鍵','開鏡 / 關鏡'],['R','換彈'],['1 2 3 4','主武器 / 副武器 / 手槍 / 刀'],['滾輪','切換武器'],['V','快速近戰'],['H','治療'],['T','修復護甲'],['Q / Z / X','小招 / 二招 / 大招'],['E','互動（按住搜索）'],['F','手電筒'],['Tab','背包'],['M','大地圖'],['Esc','暫停']].map(([k,v])=>`<span><kbd>${k}</kbd>${v}</span>`).join('')})));
  p.append(sec('手機操作',h('p',{class:'hint',text:'左半邊拖曳移動，推到底自動衝刺；衝刺時按「蹲/滑」會滑鏟。右半邊拖曳轉視角，按住射擊鍵時也可以拖曳瞄準，並會輕微自動吸附敵人。靠近物資箱、門、電閘時會出現互動按鈕，按住即可。建議橫向遊玩。'})));
  p.append(sec('撤離方式',h('p',{class:'hint',html:'<b style="color:#72f5a8">常規撤離</b> 隨時可用。<b style="color:#ffb547">付費撤離</b> 在撤離點按住 E 支付倉庫資金。<b style="color:#ff4b3e">拉閘撤離</b> 要先找到黃色電閘拉下，會觸發警報。<b style="color:#9ad0ff">直升機撤離</b> 在中段時間自動開放，或發射信號彈呼叫。<b style="color:#6db5ff">無背包撤離</b> 只有沒背背包才能通過。'})));
  p.append(sec('機關',h('p',{class:'hint',text:'紅、藍色門需要對應鑰匙卡（保險櫃、敵人遺體可能掉落）。監視器發現你會拉警報並叫來增援，可以射壞。自動砲塔有 160 點耐久。門口的紅線是絆雷，跳過去或繞開。紅色油桶一槍就會連鎖爆炸。中途會有空投，物資豐厚但敵人也會趕去。'})));
  p.append(sec('倉庫與存檔',h('p',{class:'hint',text:'資金、倉庫與配裝存在這台裝置的瀏覽器裡。清除瀏覽器資料會重置進度。'}),h('div',{class:'btns'},h('button',{class:'ghost',type:'button',text:'重置所有進度',on:{click:function(){if(this.dataset.c){PF=defaultProfile();savePF();Hub.render()}else{this.dataset.c=1;this.textContent='再按一次確認重置'}}}}))))}
