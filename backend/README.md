# CryptoPets 後端說明

`backend` 是 CryptoPets 的 API server，使用 Express、TypeScript、Supabase 與 ethers。後端負責錢包簽名登入、玩家資料、遠征、市場、好友、素材背包，以及正式階段的鏈上資料彙整。

後端是遊戲狀態的可信任入口。前端可以連錢包與送出操作，但玩家是否擁有 Pet NFT、素材 balance 是否足夠、遠征與市場狀態是否有效，應由後端透過資料庫與鏈上資料驗證。

## 後端負責事項

- 發 nonce、驗證錢包簽名並簽發 JWT。
- 管理玩家資料、寵物資料、遠征、素材、金幣、市場、交易紀錄與好友資料。
- 使用 Supabase PostgreSQL 儲存不上鏈的遊戲狀態。
- 使用 `@cryptopets/game-content` 驗證素材 ID 與內容資料。
- 使用 `@cryptopets/shared` 維持 API 型別一致。
- 正式階段讀取 Pet ERC-721 與 Material ERC-1155 資料，彙整後提供 API。
- 維護鏈上資料、資料庫快取與同步時間的邊界。
- MVP 市場維持 Supabase DB 市場；真正上鏈的資產只有 ERC-721 Pet 與 ERC-1155 Material。
- 透過 `MaterialBalanceProvider` 管理素材餘額，讓目前的 Supabase `inventory` 實作未來可替換為 indexer 或鏈上資料來源。

## 資料夾階層

```text
backend/
├── src/
│   ├── config/          環境變數與 Supabase client
│   ├── controllers/     Express controller，處理 request/response
│   ├── middleware/      auth、error handler 等 middleware
│   ├── routes/          API route 註冊
│   ├── services/        遊戲規則、資料庫操作、素材餘額 provider 與未來鏈上整合
│   ├── utils/           HTTP error、async handler 等工具
│   ├── app.ts           Express app 組裝
│   └── index.ts         server entrypoint
├── supabase/
│   ├── schema.sql       Supabase schema、index、RLS policy
│   └── clear_game_data.sql
├── Blockchain.md        鏈上資產與 metadata 實作規格
└── package.json         後端 workspace scripts 與依賴
```

## API

目前 route 定義在 `src/routes/index.ts` 與 `src/routes/authRoutes.ts`。

- `GET /health`
- `POST /auth/nonce`
- `POST /auth/login`
- `GET /player`
- `GET /resources`
- `GET /materials/backpack`
- `POST /start-expedition`
- `POST /claim-reward`
- `GET /market/listings`
- `POST /market/listings`
- `POST /market/cancel-listing`
- `POST /market/buy-listing`
- `GET /transactions`
- `POST /add-friend`
- `GET /friends`

## 市場與素材餘額

MVP 階段市場完全透過 Supabase 運作：

- 上架素材：從賣家的 `inventory` 扣除素材，新增 `market_listings`，寫入 `transactions`。
- 取消上架：將 `market_listings.status` 改為 `cancelled`，素材加回賣家 `inventory`。
- 購買素材：扣買家 `currencies.coins`，賣家增加 coins，買家增加素材，掛單改為 `sold`，雙方寫入 `transactions`。

素材餘額的讀取與增減集中在 `src/services/materialBalanceProvider.ts`：

- `MaterialBalanceProvider` 定義素材餘額介面。
- `SupabaseMaterialBalanceProvider` 是目前 MVP 實作，包住 Supabase `inventory`。
- 未來接鏈時可新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`，避免市場與遠征邏輯直接依賴 `inventory` table。

## 命名與資料格式規則

- API response 使用 `camelCase`。
- Supabase 資料庫欄位使用 `snake_case`。
- 錢包地址應正規化為小寫 `0x` 地址。
- Material ID 沿用 `game-content` 的 `MAT-{element}{grade}` 格式。
- API 路徑沿用現有命名，本次文件工作不改 route。

## 環境變數

請參考 `backend/.env.example` 建立 `backend/.env`。

```text
NODE_ENV=development
PORT=3400
CORS_ORIGIN=http://localhost:5400
JWT_SECRET=replace-with-a-long-random-secret

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

WEB3_LOGIN_DOMAIN=localhost:5400
WEB3_LOGIN_STATEMENT=Sign in to CryptoPets

RPC_URL=https://mainnet.infura.io/v3/your-key
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
MATERIAL_BACKPACK_SOURCE=local-db
MATERIAL_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=1
```

後端密鑰只能放在後端環境變數，不可暴露到前端。

## 開發指令

```bash
npm run dev:backend
npm run build:backend
npm --workspace backend run type-check
npm --workspace backend run start
```
