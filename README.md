# CryptoPets 專案說明

CryptoPets 是一個 Web3 寵物養成遊戲原型。玩家使用錢包登入，取得與養成 NFT 寵物，派遣寵物遠征取得素材，並在市場上架或購買素材。

本專案採 npm 工作區管理前端、後端、遊戲內容與共用型別。前端負責遊戲體驗，後端負責 API、資料庫與鏈上資料彙整，`game-content` 負責寵物、素材、語系與資產內容。

## 專案目標

- 讓玩家用錢包地址登入並管理自己的遊戲身份。
- 讓每隻寵物對應到 ERC-721 Pet NFT。
- 讓遠征素材對應到 ERC-1155 Material NFT/SFT。
- 讓前端透過後端 API 取得玩家、寵物、素材、遠征與市場資料。
- 讓後端整合資料庫與鏈上資料，避免前端直接決定玩家資產狀態。
- 讓遊戲內容集中在 `game-content`，提供前端、後端與未來中繼資料生成流程共用。

## 工作區

```text
.
├── frontend/      Vue 3、Vite、TypeScript 前端
├── backend/       Express、TypeScript、Supabase API 伺服器
├── game-content/  寵物、素材、語系、圖片、音訊與中繼資料來源
└── shared/        前後端共用 TypeScript 型別
```

## 資料與責任邊界

測試階段可使用本地資料與 Supabase 資料庫完成遊戲流程。正式階段由後端彙整鏈上資產與資料庫狀態後提供 API。

- 真正上鏈的資料只有兩類：ERC-721 Pet NFT 與 ERC-1155 Material NFT/SFT。
- 後續交易會以 Sepolia 測試幣為單位；目前測試階段只顯示 Sepolia 數值，不發起任何錢包轉帳或鏈上交易。
- MVP 市場透過 Supabase 運作：掛單、價格、購買、取消、交易紀錄都不上鏈。素材沒有固定價值，價格由上架者自行輸入。
- MVP 素材餘額使用 Supabase `inventory`；正式階段可改為 ERC-1155 餘額的快取。
- 資料庫資料：玩家暱稱、遠征狀態、市場掛單、交易紀錄、好友關係、快取資料、同步時間。
- 錢包登入：不上鏈，只用簽名驗證玩家是否持有該錢包地址。

## 開發狀態二次確認

目前已完成錢包登入、全域資料狀態、遠征、寵物頁、背包頁、商店頁、後端登入驗證、遠征流程、市場流程、好友流程、API 合約與資料庫 migration 的主要任務。

尚未完成或需要正式環境後續接上的項目：

- Pet NFT ownership：後端仍需接入正式 ERC-721 或索引器來源。
- Material balance：後端仍需接入正式 ERC-1155 或索引器來源。
- 寵物升級與突破 API：目前前端不假改資料，需等正式後端 API。
- 素材使用、丟棄、批量出售 API：目前前端不假改資料，需等正式後端 API。
- 真實瀏覽器 E2E smoke tests：需要可用前端、後端、Supabase、測試錢包與測試鏈環境。
- 區塊鏈合約：需要另外開發 Pet 合約、Material 合約與 Sepolia 交易/轉帳合約。
- Production logging、rate limit、CORS allowlist、Helmet 與 CI 尚待補齊。

## 命名與資料格式規則

- 程式碼變數與 API 回應使用 `camelCase`。
- 資料庫欄位使用 `snake_case`。
- Pet slug 與 Material slug 使用 `kebab-case`。
- Material ID 使用 `MAT-{element}{grade}`，例如 `MAT-2C`。
- Pet NFT 的 `tokenId` 由合約產生；中繼資料內的遊戲 ID 測試期可沿用 `TEST-PET-001`，正式期可改成 `PET-001`。
- 本次文件工作不變更現有 API 路徑或 ID 格式。

## 常用指令

```bash
npm install
npm run dev:backend
npm run dev:frontend
npm run build
npm run type-check
```

預設本機服務：

- 前端：`http://localhost:5400`
- 後端：`http://localhost:3400`

## 環境變數取得方式

本機開發請先參考 `.env.example`、`frontend/.env.example`、`backend/.env.example`。完整串接測試可改填 `.env.e2e`、`frontend/.env.e2e`、`backend/.env.e2e`，並且只使用測試專案與測試密鑰。

前端只能放公開設定，包含 `VITE_` 開頭的變數。後端才可以放 Supabase service role、JWT secret、RPC URL 等私密設定。

| 變數 | 放置位置 | 取得方式 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 前端 | 後端 API 的網址。預設指向公開後端 `https://cryptopets-api.onrender.com`。 |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | 前端、後端 | 到 Supabase 專案的 Project Settings > API 複製 Project URL。 |
| `VITE_SUPABASE_ANON_KEY` | 前端 | 到 Supabase 專案的 Project Settings > API 複製 anon public key。這是公開 key，可放前端。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 後端 | 到 Supabase 專案的 Project Settings > API 複製 service_role key。這是高權限密鑰，只能放後端測試或伺服器環境。 |
| `JWT_SECRET` | 後端 | 自行產生一組長隨機字串。測試與正式環境必須不同。 |
| `CORS_ORIGIN` | 後端 | 填前端網址。本機預設是 `http://localhost:5400`。 |
| `WEB3_LOGIN_DOMAIN` | 後端 | 填錢包簽名訊息綁定的網域。本機可用 `localhost:5400`。 |
| `WEB3_LOGIN_STATEMENT` | 後端 | 自訂錢包簽名時顯示給使用者看的登入文字。 |
| `RPC_URL` | 後端 | 從 Infura、Alchemy、QuickNode 或自架 RPC 取得。測試請使用測試鏈 RPC。 |
| `VITE_CHAIN_ID` / `CHAIN_ID` | 前端、後端 | 依目標鏈填入，例如 Ethereum mainnet 是 `1`；測試鏈請填該測試鏈 chain id。 |
| `VITE_NFT_CONTRACT_ADDRESS` / `NFT_CONTRACT_ADDRESS` | 前端、後端 | Pet ERC-721 合約部署後取得；尚未部署時可暫填全 0 地址。 |
| `VITE_MATERIAL_CONTRACT_ADDRESS` / `MATERIAL_CONTRACT_ADDRESS` | 前端、後端 | Material ERC-1155 合約部署後取得；尚未部署時可暫填全 0 地址。 |
| `MATERIAL_BACKPACK_SOURCE` | 後端 | 目前 MVP 使用 `local-db`；接上鏈上或索引器後再改為 `chain-db`。 |

## 不應提交到版本控制的資料

`.gitignore` 已忽略本機 env、測試報告、除錯紀錄與私鑰類檔案。請不要提交下列內容：

- `Error.md`，這是本機測試與問題紀錄，不應進 repo。
- `.env`、`.env.e2e`、任何含真實 Supabase service role、JWT secret、RPC key 的檔案。
- 測試錢包或部署錢包的 private key、seed phrase、keystore、pem/key/p12 檔。
- 真實使用者資料、資料庫 dump、HAR、瀏覽器測試報告與截圖。

需要提供設定格式時，只更新 `.env.example`，並使用假值、全 0 地址或明確標示的 placeholder。

## 主要文件

- `frontend/README.md`：前端開發責任與資料夾說明。
- `frontend/TASK.md`：前端任務狀態。
- `backend/README.md`：後端開發責任與資料夾說明。
- `backend/TASK.md`：後端任務狀態。
- `backend/Blockchain.md`：Pet、Material、交易/轉帳合約需求，鏈上資料、NFT、中繼資料與同步規格。
- `game-content/README.md`：遊戲內容資料夾責任與資產規則。
- `game-content/TASK.md`：遊戲內容任務狀態。
