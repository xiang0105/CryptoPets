# CryptoPets TODO

## 資料與接口

- 將 `GET /materials/backpack` 從 `local-db` 測試來源切換為 `chain-db` 正式來源。
- 建立素材 ERC-1155 / indexer 讀取流程。
- 建立寵物 ERC-721 ownership 讀取流程。
- 統一 API response envelope，例如 `{ success, data, error }`。
- 補齊 request body、params、query 的 zod validation。
- 建立 token metadata 快取與同步策略。

## 前端

- 將 `src/data/` 測試資料整理為 dev-only adapter。
- 將 Inventory 空格替換為後端素材資料渲染。
- 補齊 API loading、error、retry、empty state。
- 補齊 i18n 文案與文字溢位檢查。
- 建立 component tests 與 E2E smoke tests。

## 後端

- 接入鏈上 NFT/SFT ownership 與 material balance。
- 建立 indexer / relayer / settlement 流程。
- 補齊 API integration tests。
- 強化 Supabase migration、seed、RLS。
- 加上 request id、結構化 logging、rate limit、monitoring。

## 文件與維運

- 持續保持 README、TASK、TODO 使用繁體中文。
- 補齊 development、staging、production 設定說明。
- 建立 CI 的 build、type-check、test 檢查。
