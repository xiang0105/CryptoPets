# 前端任務狀態

## 已完成

- 建立 Vue 3 + Vite + TypeScript frontend workspace。
- 建立 Home、Pet、Store、Inventory 頁面。
- 建立 `src/api/` API client。
- 建立 MetaMask 連線與 frontend-only 測試登入流程。
- 建立 `src/web3/chainData.ts`，目前使用本地空資料 provider。
- 使用 `@cryptopets/game-content` 與 `@game-content/assets/...`。
- 導覽列已加入 Inventory。
- 背包頁測試階段呈現空素材格，不渲染素材圖。

## 待完成

- 將素材背包頁串接 `getMaterialBackpack()`。
- 正式階段由後端提供鏈上加資料庫彙整後的素材資料。
- 補齊 API loading、error、retry、empty state。
- 補齊 component tests 與 E2E smoke tests。
- 檢查所有頁面在桌面與手機寬度的文字與元素重疊問題。
