# CryptoPets 整體 TODO

## 架構與邊界

- 將 `frontend/src/data/` 的測試暫存收斂成明確的 mock/dev adapter，正式資料一律走後端 API。
- 建立 API response 統一格式，例如 `{ success, data, error }`。
- 為前端、後端、game-content 補上自動化測試與 CI。
- 把剩餘硬編碼或亂碼文案搬進 `game-content/src/lang/`，維持繁中與英文雙語來源。
- 建立檢查腳本，禁止前端新增 PNG/JPG/SVG/MP3 等資源檔，所有素材需進 `game-content/assets/`。
- 補上部署環境區分：development、staging、production。

## 上鏈與資料同步

- 設計 ERC-721 寵物 NFT 合約接口。
- 設計 ERC-1155 素材 SFT 合約接口。
- 建立 token metadata 產生與保存策略。
- 建立鏈上事件 indexer，將 mint、transfer、claim、market settlement 同步回後端。
- 決定是否需要後端 relayer 或玩家自付 gas 的交易流程。

## 專案衛生

- 補 `.env` 實際設定檢查清單。
- 增加 lint / format 工具，統一程式與文件風格。
- 定期清理 `dist/`、過期測試資料與未引用素材。
- 補上 README 中各模組的維護負責範圍。
