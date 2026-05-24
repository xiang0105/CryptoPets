# CryptoPets Frontend

前端是 Vue 3 + Vite + TypeScript 應用，只負責畫面、互動、錢包連線入口與呼叫後端 API。正式遊戲規則、資料庫寫入、上鏈接口、圖片素材、音訊與語言字典都不放在前端。

## 職責

- 顯示玩家資料、寵物、素材、市場、遠征與好友狀態。
- 透過 `src/api/` 呼叫後端。
- 透過 `src/composables/useWallet.ts` 處理 MetaMask 連線入口。
- 透過 `@cryptopets/game-content` 取得內容與語言字典。
- 透過 `@game-content/assets/...` 載入圖片、音訊、地圖與品牌圖。

## Env

請從 `frontend/.env.example` 建立 `frontend/.env`。

```text
VITE_API_BASE_URL=http://localhost:3400
VITE_FRONTEND_ONLY_AUTH=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_CHAIN_ID=1
VITE_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

變數說明：

- `VITE_API_BASE_URL`：後端 API 位置。本地預設為 `http://localhost:3400`。
- `VITE_FRONTEND_ONLY_AUTH`：測試用登入模式。`true` 時前端只連 MetaMask 並使用本地測試流程；正式串後端登入時應改成 `false`。
- `VITE_SUPABASE_URL`：Supabase 專案公開 URL。若前端暫時沒有直接使用 Supabase，可保留範本值。
- `VITE_SUPABASE_ANON_KEY`：Supabase anon key，只能是公開 anon key，不能使用 service role key。
- `VITE_CHAIN_ID`：目前顯示或提示用 chain id。正式資產驗證仍應由後端或 indexer 處理。
- `VITE_NFT_CONTRACT_ADDRESS`：公開合約位址提示。不能作為前端自行判斷 ownership 的信任來源。

## 目錄

```text
src/
  api/          後端 API client
  assets/       只放 CSS 等前端樣式資源，不放圖片或音訊
  composables/  錢包與 UI composable
  content/      將 game-content asset 轉成前端可用 mapping
  data/         測試階段本地快取，正式版需改為 dev-only adapter
  router/       Vue Router
  state/        前端暫存狀態
  views/        Home、Pet、Store 頁面
  web3/         鏈上資料 provider 介面，正式查詢應交給後端或 indexer
```

## 指令

```bash
npm run dev:frontend
npm run build:frontend
npm --workspace frontend run type-check
```

## 素材與語言

- 前端不得新增 PNG、JPG、SVG、MP3 等素材檔。
- 圖片與音訊一律放在 `game-content/assets/`。
- 語言字典一律放在 `game-content/src/lang/`。
- 前端 `src/i18n.ts` 只保存目前 locale 狀態，目前支援 `zh-TW` 與 `en`。
