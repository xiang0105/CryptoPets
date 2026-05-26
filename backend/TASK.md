# 後端任務狀態

## 已完成

- 建立 Express + TypeScript backend workspace。
- 建立 env validation 與 Supabase client。
- 建立 auth nonce / login route。
- 建立 player、market、friend、expedition controllers 與 services。
- 建立 Supabase schema 與清除測試資料 SQL。
- 使用 `@cryptopets/game-content` 驗證素材 ID。
- 新增 `GET /materials/backpack` 素材背包接口。
- 素材背包接口已回傳 `local-db` / `chain-db` 來源標記與 chain meta。

## 待完成

- 將 `chain-db` 模式接入 ERC-1155 / indexer。
- 將寵物 NFT ownership 接入 ERC-721 / indexer。
- 建立 API integration tests 與 CI。
- 強化 zod validation、rate limit、production logging。
- 補齊 migration、seed、RLS 與監控。
