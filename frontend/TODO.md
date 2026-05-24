# Frontend TODO

- 將 `src/data/pets.ts`、`src/data/goodies.ts` 改為 dev-only mock adapter，正式資料全部由 `src/api/` 取得。
- 修正所有亂碼中文 UI 文案，並統一放入 i18n。
- 將剩餘前端硬編碼文案逐步搬到 `game-content/src/lang/`。
- 建立檢查，避免前端新增圖片或音訊素材。
- 補齊 API loading、error、retry、empty 狀態。
- 將錢包登入流程切到後端 nonce / signature / JWT 驗證。
- 串接後端玩家、探險、市場、好友 API 的完整畫面狀態。
- 補前端 type-check、component tests、E2E smoke tests。
- 檢查手機與桌面版 UI 是否有文字溢出或互相遮擋。
- 移除前端不該持有的鏈上查詢責任，改由後端或 indexer 提供結果。
