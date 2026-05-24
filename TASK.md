# CryptoPets 任務狀態

## 已完成

- 建立 npm workspaces：`frontend`、`backend`、`game-content`、`shared`。
- 前端、後端、遊戲內容、整體專案各自補齊 `README.md`、`TODO.md`、`TASK.md`。
- 舊的上鏈待辦已併入整體 `TODO.md`，避免同類工作分散在額外文件。
- 明確定義前端只顯示與調用 API、後端負責邏輯與上鏈接口、game-content 負責劇本與素材。
- 將前端品牌圖、地圖與背景音樂搬到 `game-content/assets/`，前端改用 `@game-content` 載入。
- 在 `game-content/src/lang/` 建立繁體中文與英文語言字典，前端 `i18n` 改為讀取該字典。
- 刪除不再使用的根目錄 `dist/` 建置產物、前端空素材資料夾與舊說明檔。
- 後端已有 Express API、Supabase schema、玩家、探險、市場、好友與登入流程骨架。
- 前端已有 Vue 3 / Vite 畫面、路由、錢包連線入口與 API client。
- `game-content` 已提供水豚、材料與探險劇本資料模組。

## 進行中

- 前端仍保留測試階段本地寵物與素材快取，需要拆成 dev-only adapter。
- 後端已有遊戲邏輯雛形，但尚未串接正式鏈上合約。
- 遊戲內容文字目前需要重新校對，部分繁中文字串已不可讀。
- 部分頁面文字仍在前端以條件式組合，後續需逐步全部搬入 `game-content/src/lang/`。

## 未完成

- 正式 NFT/SFT 合約、metadata、indexer 與 relayer。
- API integration tests、前端 E2E tests、CI。
- 正式錯誤碼文件與 API 規格文件。
- 完整素材清單、授權來源與命名審查。
