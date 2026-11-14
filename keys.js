'use strict';
/* ================= 自訂按鍵 =================
   - 設定 → 按鍵設定：每個動作點一下再按新的鍵；跟其他動作重複時兩者互換。Esc 取消。
   - 原理：遊戲裡按下的實體鍵先換算成「預設鍵」再交給原本的程式，所以所有功能（含背包裡的 R 旋轉）都跟著改。
   - 滑鼠按鍵（左鍵射擊、右鍵開鏡、中鍵快速刀、滾輪換槍）與 Esc 固定不能改。 */
const KEY_ACTIONS=[
  ['移動',[['fwd','前進','KeyW'],['back','後退','KeyS'],['left','左移','KeyA'],['right','右移','KeyD'],['jump','跳躍 / 翻越','Space'],['sprint','衝刺','ShiftLeft'],['crouch','蹲下 / 滑鏟','KeyC'],['prone','趴下','KeyX'],['leanL','左探頭 / 長按小招 / 開鏡時切側鏡','KeyQ'],['leanR','右探頭','KeyE']]],
  ['戰鬥',[['reload','換彈（背包裡＝旋轉）','KeyR'],['w1','主武器','Digit1'],['w2','副武器','Digit2'],['w3','手槍','Digit3'],['w4','刀','Digit4'],['nade','探員手雷','KeyG'],['s2','二招','KeyB'],['s3','大招','KeyV'],['cant','切換側鏡','AltLeft'],['dropw','丟下手上的槍 / 丟棄物品','KeyP']]],
  ['道具與互動',[['use','互動 / 上下車','KeyF'],['heal','治療','KeyH'],['repair','修復護甲','KeyT'],['torch','手電筒','KeyL'],['nvg','夜視鏡','KeyZ'],['emote','動作','KeyJ'],['laptop','隨身電腦（駭入）','KeyK']]],
  ['介面與溝通',[['inv','背包 / 計分板','Tab'],['map','大地圖','KeyM'],['ping','標點','KeyO'],['chat','聊天（連線時）','Enter']]]];
const KEY_DEF={};for(const [,L] of KEY_ACTIONS)for(const [id,,c] of L)KEY_DEF[id]=c;
function keyBinds(){return Object.assign({},KEY_DEF,(PF.settings&&PF.settings.keys)||{})}
let KEYMAP=null;// 實體鍵 → 預設鍵（null = 吞掉）
function rebuildKeymap(){const b=keyBinds();const m={};for(const id in b){if(b[id]!==KEY_DEF[id])m[KEY_DEF[id]]=m[KEY_DEF[id]]||null}for(const id in b)m[b[id]]=KEY_DEF[id];
  for(const k in m)if(m[k]===k)delete m[k];KEYMAP=m}
function keyLabel(c){if(!c)return'—';if(/^Key[A-Z]$/.test(c))return c[3];if(/^Digit\d$/.test(c))return c[5];if(/^Numpad\d$/.test(c))return'數字鍵 '+c[6];if(/^F\d+$/.test(c))return c;
  return({Space:'空白鍵',ShiftLeft:'左 Shift',ShiftRight:'右 Shift',ControlLeft:'左 Ctrl',ControlRight:'右 Ctrl',AltLeft:'左 Alt',AltRight:'右 Alt',Tab:'Tab',Enter:'Enter',Backspace:'Backspace',CapsLock:'Caps Lock',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Insert:'Insert',Delete:'Delete',Home:'Home',End:'End',PageUp:'PgUp',PageDown:'PgDn'})[c]||c}
function bindLabel(id){return keyLabel(keyBinds()[id])}
// 攔截：遊戲中把實體鍵換成預設鍵後重新送出
function keyIntercept(e){if(typeof M==='undefined'||typeof Hub==='undefined')return;if(!e.isTrusted||Hub.binding)return;if(!KEYMAP)rebuildKeymap();if(!(e.code in KEYMAP))return;
  const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;if(typeof UI!=='undefined'&&UI.chatting)return;if(!M.running)return;
  e.stopImmediatePropagation();e.preventDefault();const to=KEYMAP[e.code];if(!to)return;
  dispatchEvent(new KeyboardEvent(e.type,{code:to,key:e.key,repeat:e.repeat,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,bubbles:true,cancelable:true}))}
addEventListener('keydown',keyIntercept,true);addEventListener('keyup',keyIntercept,true);
// 設定頁
function keySec(){const box=h('div',{class:'keyBinds'});const b=keyBinds();
  for(const [g,L] of KEY_ACTIONS){box.append(h('h4',{text:g}));for(const [id,label] of L){const changed=b[id]!==KEY_DEF[id];
    const btn=h('button',{type:'button',class:'kb'+(Hub.binding===id?' wait':'')+(changed?' changed':''),text:Hub.binding===id?'請按新的鍵…（Esc 取消）':keyLabel(b[id]),on:{click:()=>{Hub.binding=id;Hub.render()}}});
    box.append(h('div',{class:'kbRow'},h('span',{text:label}),btn))}}
  const reset=h('button',{type:'button',class:'mini ghost',text:'全部恢復預設',on:{click:()=>{PF.settings.keys={};savePF();rebuildKeymap();Hub.binding=null;Hub.render()}}});
  return sec('按鍵設定',h('p',{class:'hint',style:'margin:0',text:'點一下要改的動作，再按新的按鍵。如果新按鍵已經被別的動作使用，兩個動作會互換。滑鼠按鍵（左鍵射擊、右鍵開鏡、中鍵快速刀、滾輪換槍）和 Esc 不能改。'}),box,reset)}
addEventListener('keydown',e=>{if(typeof Hub==='undefined'||!Hub.binding)return;e.preventDefault();e.stopImmediatePropagation();const id=Hub.binding;
  if(e.code==='Escape'){Hub.binding=null;Hub.render();return}
  const b=keyBinds();const other=Object.keys(b).find(k=>k!==id&&b[k]===e.code);const keys_=Object.assign({},PF.settings.keys||{});
  if(other)keys_[other]=b[id];keys_[id]=e.code;for(const k in keys_)if(keys_[k]===KEY_DEF[k])delete keys_[k];PF.settings.keys=keys_;savePF();rebuildKeymap();Hub.binding=null;
  if(other)note&&note(`「${KEY_ACTIONS.flatMap(x=>x[1]).find(a=>a[0]===other)[1]}」改成 ${keyLabel(keys_[other]||KEY_DEF[other])}`);Hub.render()},true);
