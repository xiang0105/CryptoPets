# 前端任務狀態

任務狀態以目前 repo 內可驗證的程式碼為準。已存在且可確認的功能標記為完成；只有規劃、預留或尚未接實作的項目維持未勾選。

## 已完成

- [x] 建立 Vue 3、Vite、TypeScript frontend workspace。
- [x] 建立 `HomeView`、`PetsView`、`StoreView`、`InventoryView` 頁面。
- [x] 建立 Vue Router 路由設定。
- [x] 建立 `src/api/client.ts`、`src/api/auth.ts`、`src/api/game.ts` 作為 API client。
- [x] 建立 MetaMask 連線與 frontend-only 測試登入流程。
- [x] 建立 `src/web3/chainData.ts`，目前使用本地空資料 provider。
- [x] 使用 `@cryptopets/game-content` 與 `@cryptopets/shared`。
- [x] 建立前端測試資料與測試狀態資料夾。
- [x] 導覽列已加入 Inventory 頁面。
- [x] 背包頁已建立測試階段畫面。

## 待完成：MVP

- [ ] 將 Inventory 頁面正式串接 `getMaterialBackpack()`。
- [ ] 補齊所有 API 的 loading、error、retry、empty state。
- [ ] 將 Pets 頁面的寵物資料來源改為後端彙整資料。
- [ ] 將 Store 頁面的市場掛單、上架、購買、取消流程完整串接後端。
- [ ] 將遠征開始與領取獎勵流程完整串接後端。
- [ ] 統一前端 API 錯誤訊息與使用者可讀文案。
- [ ] 檢查桌面與手機寬度下的文字、按鈕與卡片是否重疊。
- [ ] 補齊基本 component tests 或頁面 smoke tests。

## 待完成：正式上線前

- [ ] 關閉 frontend-only auth，正式使用後端 nonce 與簽名登入。
- [ ] 正式階段只透過後端 API 取得 Pet NFT 與 Material balance 的彙整結果。
- [ ] 補齊錢包切換帳號、斷線、錯鏈、無錢包插件等狀態處理。
- [ ] 補齊交易中、同步中、鏈上資料延遲等提示狀態。
- [ ] 補齊 E2E smoke tests。
- [ ] 檢查生產環境 build、preview 與部署設定。
- [ ] 確認所有公開環境變數不包含後端密鑰。
