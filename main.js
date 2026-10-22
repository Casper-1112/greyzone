'use strict';
/* ================= boot + loop ================= */
let last=performance.now(),attractA=0;
function attract(dt){attractA+=dt*.04;const R=W?Math.min(W.half*.55,90):70;camera.position.set(Math.cos(attractA)*R,Math.max(26,R*.38),Math.sin(attractA)*R);camera.lookAt(0,2,0);if(Math.abs(camera.fov-70)>.01){camera.fov=70;camera.updateProjectionMatrix()}torch.intensity=0}
function render(){renderer.clear();renderer.render(scene,camera);if(M.running&&P&&P.alive&&!UI.killcamOn){renderer.clearDepth();renderer.render(vmScene,vmCam)}}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  try{
    if(M.running&&!M.paused){updateMatch(dt);killcamTick(dt);hud(dt)}else if(!M.running)attract(dt);
    updateFX(M.paused?0:dt);updateLamps();updateShadowCam();render()
  }catch(err){console.error(err);if(!loop.errShown){loop.errShown=true;note('發生錯誤：'+err.message)}}}
if(isTouch)$('app').classList.add('touch');applyQuality();
M.diff=PF.settings.diff;M.tod=PF.settings.tod;
hubWorld();Hub.render();
addEventListener('keydown',e=>{if(e.code==='Escape'&&M.running&&(fallbackLook||isTouch)&&!UI.invOpen&&!UI.mapOpen)pauseGame()});
requestAnimationFrame(loop);

// invite link ?join=CODE
(function(){const m=location.search.match(/[?&]join=([A-Z0-9]{4,6})/i);if(m){Hub.tab='net';Hub.joinCode=m[1].toUpperCase();Hub.render()}})();
// FPS counter
let fpsN=0,fpsT=0;setInterval(()=>{const el=$('fps');if(!el)return;el.hidden=!PF.settings.fps;el.textContent=fpsN+' FPS';fpsN=0},1000);
(function cnt(){fpsN++;requestAnimationFrame(cnt)})();
