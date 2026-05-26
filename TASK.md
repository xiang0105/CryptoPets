# CryptoPets 任務狀態

## 已完成

- 建立 npm workspaces：`frontend`、`backend`、`game-content`、`shared`。
- 建立 Vue 3 / Vite 前端與 Express / TypeScript 後端。
- 建立 Supabase schema、玩家、遠征、市場、好友與交易相關 API。
- 建立 shared 型別，供前後端共用。
- 建立 game-content 的寵物、素材與語系資料。
- 建立錢包登入流程與測試用前端資料流程。
- 新增 `/inventory` 素材背包頁面，測試階段顯示空素材格。
- 新增 `GET /materials/backpack` 保留接口，回傳素材背包資料來源與 chain meta。

## 目前資料來源

- 前端測試：本地資料與空素材格。
- 後端測試：Supabase 資料庫。
- 正式目標：鏈上資產資料加資料庫狀態資料。

## 待完成

- 將素材背包接口接到鏈上 ERC-1155 / indexer。
- 將寵物 NFT ownership 檢查接入後端。
- 補齊 API integration tests 與 E2E smoke tests。
- 補齊 production logging、rate limit、monitoring。
