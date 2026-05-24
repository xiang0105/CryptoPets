# Game Content TODO

- 重新校對所有繁中劇本與角色文案，修復目前不可讀的亂碼。
- 將剩餘前端硬編碼 UI 文案移到 `src/lang/zh-TW.ts` 與 `src/lang/en.ts`。
- 補完整材料清單，將素材檔與 `materialDefinitions` 一一對應。
- 補素材授權、來源與版本紀錄。
- 為每個素材定義 alt text、用途、尺寸建議與是否可上鏈 metadata。
- 將探險劇本規則結構化，讓後端能直接引用條件與獎勵倍率。
- 補 token metadata 產生策略，包括 image、animation_url、attributes。
- 建立素材命名檢查腳本，避免中文檔名或拼字錯誤重新出現。
- 建立語言鍵檢查，確保 `zh-TW` 與 `en` 欄位一致。
- 清點未引用素材，確認保留、刪除或接入內容定義。
