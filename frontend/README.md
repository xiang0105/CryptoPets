# CryptoPets 前端說明

前端使用 Vue 3、Vite 與 TypeScript，負責遊戲介面、錢包登入、測試資料展示與後端 API 串接。

## 功能

- 首頁：遠征選擇與狀態展示。
- 寵物頁：隊伍、寵物資料、升級與突破介面。
- 商店頁：素材商品、上架、購買與交易狀態。
- 背包頁：依素材背包參考圖製作，測試階段只顯示空素材格。
- 錢包登入：MetaMask 連線；測試階段可使用 frontend-only flow。

## 資料來源

- 測試階段：前端使用本地資料 provider，素材背包維持空格。
- 後端資料：透過 `src/api/` 呼叫 Express API。
- 正式階段：素材與寵物資產由後端彙整鏈上資料與資料庫資料後提供。

## 環境變數

請參考 `frontend/.env.example` 建立 `frontend/.env`。

```text
VITE_API_BASE_URL=http://localhost:3400
VITE_FRONTEND_ONLY_AUTH=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_CHAIN_ID=1
VITE_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_MATERIAL_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

## 目錄

```text
src/
  api/          後端 API client
  assets/       前端 CSS
  composables/  Vue composables
  content/      game-content asset mapping
  data/         測試資料與 dev-only adapter
  router/       Vue Router
  state/        前端測試狀態
  views/        Home、Pet、Store、Inventory 頁面
  web3/         鏈上資料 provider 介面與本地測試實作
```

## 指令

```bash
npm run dev:frontend
npm run build:frontend
npm --workspace frontend run type-check
```
