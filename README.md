# 灰區撤離（GitHub Pages 版）

## 放上 GitHub Pages
1. 把整個 `grey-zone` 資料夾複製到你的 `casper-1112.github.io` repo 根目錄。
2. commit 並 push。
3. 幾分鐘後打開 `https://casper-1112.github.io/grey-zone/` 就能玩。

## 連線
- 一個人在「連線」頁按「建立房間」，把 5 碼房號給朋友。
- 朋友在同一頁輸入房號按「加入」。
- 房主到「出擊」頁選好模式、地圖、難度，按「開始連線對局」。
- 連線使用 WebRTC 點對點，配對透過 PeerJS 的免費公用伺服器（0.peerjs.com）。
  少數公司或學校網路會擋 WebRTC，這時候會連不上，換手機熱點通常就能連。
- 敵人由房主的瀏覽器模擬，房主的電腦和網路越好越順。

## 存檔
資金、倉庫、配裝存在各自瀏覽器的 localStorage，清除瀏覽器資料會重置進度。

## 本機測試
直接雙擊 index.html 用 file:// 開啟時，部分瀏覽器會擋住 js 檔，
請用簡易伺服器：在資料夾內執行 `python -m http.server`，再開 http://localhost:8000/
