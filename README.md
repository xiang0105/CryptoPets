# CryptoPets 專案說明

CryptoPets 是一個 Web3 寵物養成遊戲原型。玩家使用錢包登入，取得與養成 NFT 寵物，派遣寵物遠征取得素材，並在市場交易素材。

本專案採 npm workspaces 管理前端、後端、遊戲內容與共用型別。前端負責遊戲體驗，後端負責 API、資料庫與鏈上資料彙整，`game-content` 負責寵物、素材、語系與資產內容。

## 專案目標

- 讓玩家用錢包地址登入並管理自己的遊戲身份。
- 讓每隻寵物對應到 ERC-721 Pet NFT。
- 讓遠征素材對應到 ERC-1155 Material NFT/SFT。
- 讓前端透過後端 API 取得玩家、寵物、素材、遠征與市場資料。
- 讓後端整合資料庫與鏈上資料，避免前端直接決定玩家資產狀態。
- 讓遊戲內容集中在 `game-content`，提供前端、後端與未來 metadata 生成流程共用。

## 工作區

```text
.
├── frontend/      Vue 3、Vite、TypeScript 前端
├── backend/       Express、TypeScript、Supabase API server
├── game-content/  寵物、素材、語系、圖片、音訊與 metadata 來源資料
└── shared/        前後端共用 TypeScript 型別
```

## 資料與責任邊界

測試階段可使用本地資料與 Supabase 資料庫完成遊戲流程。正式階段由後端彙整鏈上資產與資料庫狀態後提供 API。

- 真正上鏈的資料只有兩類：ERC-721 Pet NFT 與 ERC-1155 Material NFT/SFT。
- MVP 市場透過 Supabase 運作：掛單、價格、購買、取消、交易紀錄都不上鏈。
- MVP 素材餘額使用 Supabase `inventory`；正式階段可改為 ERC-1155 balance 的快取。
- 資料庫資料：玩家暱稱、遠征狀態、市場掛單、交易紀錄、好友關係、快取資料、同步時間。
- 錢包登入：不上鏈，只用簽名驗證玩家是否持有該錢包地址。

## 命名與資料格式規則

- 程式碼變數與 API response 使用 `camelCase`。
- 資料庫欄位使用 `snake_case`。
- Pet slug 與 Material slug 使用 `kebab-case`。
- Material ID 使用 `MAT-{element}{grade}`，例如 `MAT-2C`。
- Pet NFT 的 `tokenId` 由合約產生；metadata 內的遊戲 ID 測試期可沿用 `TEST-PET-001`，正式期可改成 `PET-001`。
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

## 主要文件

- `frontend/README.md`：前端開發責任與資料夾說明。
- `frontend/TASK.md`：前端任務狀態。
- `backend/README.md`：後端開發責任與資料夾說明。
- `backend/TASK.md`：後端任務狀態。
- `backend/Blockchain.md`：鏈上資料、NFT、metadata 與同步規格。
- `game-content/README.md`：遊戲內容資料夾責任與資產規則。
- `game-content/TASK.md`：遊戲內容任務狀態。
