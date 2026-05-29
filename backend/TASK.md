# 後端任務狀態

任務狀態以目前 repo 內可驗證的程式碼為準。已存在且可確認的功能標記為完成；只有規劃、預留或尚未接實作的項目維持未勾選。

## 已完成

- [x] 建立 Express、TypeScript backend workspace。
- [x] 建立 env validation 與 Supabase client。
- [x] 建立 Express app、route、controller、service 分層。
- [x] 建立 auth nonce 與 login route。
- [x] 建立 JWT auth middleware。
- [x] 建立 player、market、friend、expedition controllers 與 services。
- [x] 建立 Supabase schema、index、RLS policy 與清除測試資料 SQL。
- [x] 使用 `@cryptopets/game-content` 驗證素材 ID。
- [x] 使用 `@cryptopets/shared` 回傳共用型別。
- [x] 建立 `GET /materials/backpack` 素材背包接口。
- [x] 素材背包接口已回傳 `local-db` / `chain-db` 來源標記與 chain meta。
- [x] 建立市場掛單、購買、取消與交易紀錄流程。
- [x] 明確採用 MVP Supabase DB 市場，市場掛單、價格與交易紀錄不上鏈。
- [x] 建立 `MaterialBalanceProvider` 介面與 `SupabaseMaterialBalanceProvider` 實作。
- [x] 市場素材上架、取消、購買流程已透過 `MaterialBalanceProvider` 操作素材餘額。
- [x] 遠征獎勵已透過 `MaterialBalanceProvider` 增加素材餘額。

## 待完成：MVP

- [ ] 補齊 API integration tests。
- [ ] 補齊 service 層單元測試。
- [ ] 強化所有 request body 與 query 的 zod validation。
- [ ] 補齊一致的 API 錯誤碼與錯誤文件。
- [ ] 補齊 seed 或測試資料建立流程。
- [ ] 檢查 Supabase migration 流程，避免只依賴單一 schema dump。
- [ ] 將素材背包接口與前端 Inventory 頁面完成串接驗證。
- [ ] 補齊 production logging、request id 與基本 monitoring。

## 待完成：正式上線前

- [ ] 將 Pet NFT ownership 接入 ERC-721 合約或 indexer。
- [ ] 將 Material balance 接入 ERC-1155 合約或 indexer。
- [ ] 新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`。
- [ ] 建立鏈上資料同步流程與資料庫快取策略。
- [ ] 建立 metadata URI 讀取與驗證流程。
- [ ] 建立市場交易與鏈上素材 balance 的一致性檢查。
- [ ] 補齊 rate limit、CORS allowlist、helmet 設定檢查與安全測試。
- [ ] 補齊 CI，在 pull request 執行 type-check、build 與測試。
- [ ] 補齊部署環境的 secret 管理與健康檢查。
