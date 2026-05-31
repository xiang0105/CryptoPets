# CryptoPets 前端說明

`frontend` 是 CryptoPets 的玩家介面，使用 Vue 3、Vite 與 TypeScript。前端負責遊戲畫面、錢包連線、玩家操作流程，以及呼叫後端 API 取得彙整後的遊戲狀態。

前端不應直接決定玩家是否擁有鏈上資產。正式資料來源應以後端 API 為準；前端可以讀取錢包地址與發起簽名，但 Pet NFT ownership、Material balance、遠征結果與市場狀態都應由後端驗證與回傳。

## 前端負責事項

- 顯示首頁、寵物、商店、背包等遊戲頁面。
- 提供 MetaMask 錢包連線與簽名登入流程。
- 呼叫 `src/api/` 中的 API client 與後端交換資料。
- 使用 `@cryptopets/game-content` 取得寵物、素材、語系與資產路徑。
- 使用 `@cryptopets/shared` 的共用型別，保持 API response 與後端一致。
- 所有玩家、寵物、素材、市場與遠征資料都以後端 API 為來源。
- 呈現 loading、error、empty state 與行動裝置版面。

## 資料夾階層

```text
frontend/
├── public/             靜態公開檔案，例如 favicon
├── src/
│   ├── api/            後端 API client，包含 auth 與 game API
│   ├── assets/         前端 CSS 與畫面樣式
│   ├── composables/    Vue composables，例如錢包連線
│   ├── content/        game-content asset mapping
│   ├── data/           後端資料轉成前端 view model 的暫存 cache
│   ├── router/         Vue Router 路由設定
│   ├── state/          頁面互動暫存狀態
│   ├── views/          Home、Pets、Store、Inventory 頁面
│   └── web3/           鏈上資料 provider 介面預留；目前由後端回報 chain 狀態
├── index.html          Vite 入口 HTML
├── vite.config.ts      Vite 設定
└── package.json        前端 workspace scripts 與依賴
```

## API 調用規則

- 所有後端請求集中在 `src/api/`。
- API response 使用 `camelCase`。
- API 路徑沿用目前後端定義，不在前端自行改名。
- 錢包簽名登入使用後端 nonce 與 login API。
- 正式階段的寵物與素材資料應由後端回傳，前端不自行判定鏈上 ownership 或 balance。

## 環境變數

請參考 `frontend/.env.example` 建立 `frontend/.env`。

```text
VITE_API_BASE_URL=http://localhost:3400
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_CHAIN_ID=1
VITE_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_MATERIAL_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

前端只放公開設定與 `VITE_` 變數，不放 Supabase service role、JWT secret、RPC private key 或任何後端密鑰。

## 開發指令

```bash
npm run dev:frontend
npm run build:frontend
npm --workspace frontend run type-check
```
