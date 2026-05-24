# Backend TODO

- 統一 API response 格式與錯誤碼文件。
- 補 zod validation 覆蓋所有 request body、params、query。
- 補 API integration tests。
- 增加 rate limit，特別是 auth、claim reward、market actions。
- 將探險獎勵改為讀取 `game-content` 劇本與材料設定，而不是只用簡化亂數。
- 串接正式 NFT/SFT 合約 ownership 查詢。
- 建立鏈上事件 indexer 與同步游標。
- 設計 relayer 或玩家交易簽名流程。
- 強化 Supabase RLS、資料庫 migration 與 seed 流程。
- 增加 request id、結構化 logging 與 production monitoring。
