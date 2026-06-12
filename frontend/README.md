# CryptoPets 前端說明

`frontend` 是 CryptoPets 的玩家介面，使用 Vue 3、Vite 與 TypeScript。前端負責遊戲畫面、錢包連線、玩家操作流程，以及呼叫後端 API 取得彙整後的遊戲狀態。

前端不應直接決定玩家是否擁有鏈上資產。正式資料來源應以後端 API 為準；前端可以讀取錢包地址與發起簽名，但 Pet NFT 持有權、Material 餘額、遠征結果與市場狀態都應由後端驗證與回傳。

## 前端負責事項

- 顯示首頁、寵物、商店、背包等遊戲頁面。
- 提供 MetaMask 錢包連線與簽名登入流程。
- 呼叫 `src/api/` 中的 API 用戶端與後端交換資料。
- 使用 `@cryptopets/game-content` 取得寵物、素材、語系與資產路徑。
- 使用 `@cryptopets/shared` 的共用型別，保持 API 回應與後端一致。
- 所有玩家、寵物、素材、市場與遠征資料都以後端 API 為來源。
- 呈現載入中、錯誤、空狀態與行動裝置版面。
- 測試階段不發起 Sepolia 轉帳；商店只顯示使用者輸入的 Sepolia 價格，背包不顯示素材固定價值。

## 資料夾階層

```text
frontend/
├── public/             靜態公開檔案，例如 favicon
├── src/
│   ├── api/            後端 API 用戶端，包含驗證與遊戲 API
│   ├── assets/         前端 CSS 與畫面樣式
│   ├── composables/    Vue composables，例如錢包連線
│   ├── content/        遊戲內容資產對應
│   ├── data/           後端資料轉成前端顯示模型的暫存快取
│   ├── router/         Vue Router 路由設定
│   ├── state/          頁面互動暫存狀態
│   ├── views/          Home、Pets、Store、Inventory 頁面
│   └── web3/           鏈上資料提供者介面預留；目前由後端回報鏈上狀態
├── index.html          Vite 入口 HTML
├── vite.config.ts      Vite 設定
└── package.json        前端工作區指令與依賴
```

## API 調用規則

- 所有後端請求集中在 `src/api/`。
- API 回應使用 `camelCase`。
- API 路徑沿用目前後端定義，不在前端自行改名。
- 錢包簽名登入使用後端 nonce 與 login API。
- 正式階段的寵物與素材資料應由後端回傳，前端不自行判定鏈上持有權或餘額。
- 前端不得為了展示效果自行發放素材、增加 Sepolia 餘額、修改寵物等級、完成遠征或產生正式遠征紀錄。
- 當後端 API 尚不存在時，按鈕應停用或顯示「後端接口未開放」，不能本地假改資料。

## 畫面資料來源二次確認

- Home 遠征頁：開始、領獎與遠征紀錄都由後端 API 回傳。
- Pets 寵物頁：寵物資料由 `GET /player` 回傳；升級與突破 API 尚未開放，因此前端不改本地寵物資料。
- Inventory 背包頁：素材列表、來源、同步時間與鏈上狀態由 `GET /materials/backpack` 回傳；素材沒有固定價值。
- Store 商店頁：市場列表、上架、取消、購買與交易紀錄都由後端 API 回傳；測試階段不做 Sepolia 轉帳。
- Wallet 登入：前端只取得錢包地址並請使用者簽名，登入判定由後端 nonce/login 完成。

## 環境變數

請參考 `frontend/.env.example` 建立 `frontend/.env`。如果要跑完整串接測試，可以改填 `frontend/.env.e2e`，並且只使用測試 Supabase 專案、測試鏈與測試合約資訊。

```text
VITE_API_BASE_URL=https://cryptopets-api.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_CHAIN_ID=1
VITE_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_MATERIAL_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

前端只放公開設定與 `VITE_` 變數，不放 Supabase service role、JWT secret、RPC private key 或任何後端密鑰。

| 變數 | 用途 | 取得方式 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 後端 API base URL。 | 預設指向公開後端 `https://cryptopets-api.onrender.com`；若要本機開發可改成 `http://localhost:3400`。 |
| `VITE_SUPABASE_URL` | Supabase 專案 URL。 | 到 Supabase 專案的 Project Settings > API 複製 Project URL。 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 前端公開 anon key。 | 到 Supabase 專案的 Project Settings > API 複製 anon public key。不要填 service_role key。 |
| `VITE_CHAIN_ID` | 前端檢查錢包所在鏈。 | 依測試鏈或正式鏈填入 chain id，例如 Ethereum mainnet 是 `1`。 |
| `VITE_NFT_CONTRACT_ADDRESS` | Pet ERC-721 合約地址，用於顯示與鏈上狀態提示。 | Pet 合約部署後由部署結果或區塊鏈瀏覽器取得；尚未部署可暫填全 0 地址。 |
| `VITE_MATERIAL_CONTRACT_ADDRESS` | Material ERC-1155 合約地址，用於顯示與鏈上狀態提示。 | Material 合約部署後由部署結果或區塊鏈瀏覽器取得；尚未部署可暫填全 0 地址。 |

前端 env 是會被打包進瀏覽器的公開資訊。凡是會授權寫資料、管理資料庫、簽 JWT 或呼叫私有 RPC 的值，都不要放在前端。

## 開發指令

```bash
npm run dev:frontend
npm run build:frontend
npm --workspace frontend run type-check
```
