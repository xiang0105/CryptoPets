# 遊戲內容任務狀態

任務狀態以目前 repo 內可驗證的程式碼與資產為準。已存在且可確認的功能標記為完成；只有規劃、預留或尚未接實作的項目維持未勾選。

## 已完成

- [x] 建立 game-content workspace。
- [x] 建立 `src/capybaras.ts` 寵物資料。
- [x] 建立 `src/materials.ts` 素材資料。
- [x] 建立 `src/stories.ts` 故事資料。
- [x] 建立 `src/lang/` 繁中、英文與語系型別。
- [x] 建立素材 ID 驗證函式 `isKnownMaterialId()`。
- [x] 建立 `assets/capybaras/` 寵物圖片資料夾。
- [x] 建立 `assets/goodies/` 素材圖片資料夾。
- [x] 建立 `assets/branding/`、`assets/maps/`、`assets/audio/`、`assets/example/`。
- [x] 透過 package exports 提供前端引用資產。

## 待完成：MVP

- [ ] 修正目前繁中文案中的亂碼內容。
- [ ] 補齊素材定義，讓 MVP 遠征與市場有足夠素材可使用。
- [ ] 補齊素材圖片與 `imageFrames`，避免素材缺圖。
- [ ] 統一寵物、素材、故事與語系資料的命名品質。
- [ ] 補齊內容資料 schema 檢查或 type-level 檢查。
- [ ] 補齊內容資料測試，確認 ID、slug、asset path 不重複且存在。

## 待完成：正式上線前

- [ ] 建立 `game-content/metadata/pets/` metadata 產出目錄。
- [ ] 建立 `game-content/metadata/materials/` metadata 產出目錄。
- [ ] 建立 Pet metadata JSON 生成流程。
- [ ] 建立 Material metadata JSON 生成流程。
- [ ] 建立 Material ID 到 ERC-1155 tokenId 的 mapping。
- [ ] 建立 Pet game id 到 ERC-721 metadata 的 mapping。
- [ ] 將 Pet 圖片與 metadata 上傳到 IPFS 或 Arweave。
- [ ] 將 Material 圖片與 metadata 上傳到 IPFS 或 Arweave。
- [ ] 確認 `branding`、`maps`、`audio`、`example` 不被納入上鏈 metadata。
