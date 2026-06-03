# Supabase 資料庫流程

`schema.sql` 是完整資料庫結構快照，用來重建本機或 staging 資料庫。
`migrations/` 是可排序、可審查的 migration 歷史，用來記錄正式環境風格的資料庫變更。

## Migration 規則

- 每次資料庫結構變更都在 `migrations/` 新增一個有編號的 SQL 檔。
- 檔名使用 `NNNN_short_description.sql`，例如 `0002_expedition_type_to_forests.sql`。
- Migration 應盡量可重跑：優先使用 `if not exists`、`drop ... if exists`，或以 `do $$` 區塊保護重複執行。
- 套用 migration 後要同步更新 `schema.sql`，讓新環境仍可用一份快照重建完整資料庫。
- Seed 資料與 migration 分開管理；`seed_game_data.sql` 只用於開發或 staging。

## 套用順序

新建本機或 staging 資料庫時：

1. 執行 `schema.sql`。
2. 依檔名字典序執行 `migrations/` 內的每個 SQL 檔。
3. 視需要執行 `seed_game_data.sql` 建立測試資料。

既有資料庫要升級時：

1. 先審查下一個 migration 檔案。
2. 只套用該環境尚未套用過的 migration。
3. 如果資料庫結構有變，需在同一批變更中更新 `schema.sql`。

## 清除與 Seed

`clear_game_data.sql` 用於清除遊戲狀態，預設保留使用者與登入 nonce 歷史。
`seed_game_data.sql` 會建立固定、可重跑的開發資料：

- 可登入流程使用的玩家錢包資料；
- 初始寵物；
- 測試階段相容資源欄位；
- 素材餘額；
- 一筆 active 市場掛單；
- 已接受的好友關係。

錢包登入仍然需要在前端用對應錢包簽名。Seed 的目的不是繞過登入，而是確保錢包驗證成功後，後端能載入完整玩家資料、素材、市場與好友資料。

## 不應提交的資料

以下資料只應存在本機或部署平台，不應提交到版本控制：

- `.env`、`.env.e2e`、任何包含 Supabase service role、JWT secret、RPC key 的檔案。
- 測試錢包私鑰、keystore、seed phrase、部署者私鑰。
- 真實或測試環境的資料庫 dump，除非已確認不含使用者資料與密鑰。
- `Error.md`、瀏覽器測試報告、HAR、截圖或其他本機除錯紀錄。

如果需要提供範例，請只更新 `.env.example`，並使用假值或全 0 合約地址。
