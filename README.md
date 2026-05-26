# CryptoPets 專案說明

CryptoPets 是一個以錢包登入、寵物養成、遠征、素材背包與市場交易為核心的 Web3 遊戲原型。專案採 npm workspaces 管理前端、後端、共用型別與遊戲內容。

## 工作區

- `frontend/`：Vue 3 + Vite + TypeScript 前端。
- `backend/`：Express + TypeScript API server，連接 Supabase。
- `game-content/`：遊戲設定、語系文案與靜態素材。
- `shared/`：前後端共用 TypeScript 型別。

## 資料來源策略

- 測試階段：前端使用本地測試資料，後端使用資料庫資料。
- 正式階段：後端會整合鏈上資料與資料庫資料，鏈上作為資產所有權與素材餘額來源，資料庫保存玩家狀態、交易紀錄與可索引快取。
- 素材背包目前使用 `GET /materials/backpack` 的保留接口，回傳資料來源標記；測試預設為 `local-db`，正式可切換為 `chain-db`。

## 素材背包

- 前端已依 `game-content/assets/example/Material backpack.png` 建立 `/inventory` 頁面。
- 測試階段不顯示素材圖，僅呈現與市場一致的空格子。
- 後端已預留素材背包 API，未來接上鏈上 ERC-1155 / indexer 後會回填使用者素材資訊。

## 環境設定

請依需求建立：

- `frontend/.env`
- `backend/.env`

前端只放公開設定與 `VITE_` 變數；後端保存 Supabase service role、JWT secret、RPC key 等敏感資訊。

## 常用指令

```bash
npm install
npm run dev:backend
npm run dev:frontend
npm run build
npm run type-check
```

預設本機網址：

- 前端：`http://localhost:5400`
- 後端：`http://localhost:3400`

## 文件

- 根目錄：`README.md`、`TASK.md`、`TODO.md`
- 前端：`frontend/README.md`、`frontend/TASK.md`、`frontend/TODO.md`
- 後端：`backend/README.md`、`backend/TASK.md`、`backend/TODO.md`
- 遊戲內容：`game-content/README.md`、`game-content/TASK.md`、`game-content/TODO.md`
