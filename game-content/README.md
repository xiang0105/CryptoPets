# CryptoPets 遊戲內容說明

`game-content` 是 CryptoPets 的遊戲內容來源，負責保存寵物、素材、故事、語系、圖片、音訊與未來 NFT 中繼資料的來源資料。前端與後端都應從這個工作區取得遊戲內容，避免在各自專案中重複定義寵物或素材規則。

## game-content 負責事項

- 定義 Pet NFT 的遊戲資料來源。
- 定義 Material ERC-1155 的遊戲資料來源。
- 提供素材 ID 驗證函式給後端使用。
- 提供前端顯示用的寵物、素材、語系與靜態資產路徑。
- 保存未來中繼資料 JSON 生成流程需要的來源資料。
- 區分哪些資產會上鏈，哪些只用於 UI、地圖、音訊或參考圖。
- 素材內容不定義固定價格；市場價格由使用者上架時自行輸入。

## 資料夾階層

```text
game-content/
├── src/
│   ├── capybaras.ts       Pet NFT 遊戲資料與中繼資料欄位來源
│   ├── materials.ts       Material ERC-1155 遊戲資料與中繼資料欄位來源
│   ├── stories.ts         遊戲敘事資料
│   ├── index.ts           套件匯出入口
│   └── lang/              繁中、英文與語系型別
├── assets/
│   ├── capybaras/         Pet NFT 圖片來源
│   ├── goodies/           Material 圖片來源
│   ├── branding/          品牌與介面圖片，不上鏈
│   ├── maps/              地圖圖片，不上鏈
│   ├── audio/             音訊，不上鏈
│   └── example/           設計參考圖，不上鏈
├── metadata/
│   ├── pets/              未來 Pet 中繼資料 JSON 產出目錄
│   └── materials/         未來 Material 中繼資料 JSON 產出目錄
└── package.json
```

`metadata/` 目前是未來規劃目錄；若尚未建立，不代表中繼資料流程已完成。

## 上鏈資料來源

Pet NFT：

- 遊戲資料來源：`src/capybaras.ts`
- 圖片來源：`assets/capybaras/`
- 未來中繼資料產物：`metadata/pets/`

Material ERC-1155：

- 遊戲資料來源：`src/materials.ts`
- 圖片來源：`assets/goodies/`
- 未來中繼資料產物：`metadata/materials/`
- metadata 應描述素材 ID、slug、element、grade、圖片與說明，不應包含固定價格或平台指定價值。

不上鏈資產：

- `assets/branding/`
- `assets/maps/`
- `assets/audio/`
- `assets/example/`

## 命名規則

- Pet slug 使用 `kebab-case`，例如 `sakikojin`。
- Material slug 使用 `kebab-case`，例如 `yuzu-bite`。
- Material ID 使用 `MAT-{element}{grade}`，例如 `MAT-2C`。
- 測試期 Pet game id 可使用 `TEST-PET-001`。
- 正式期 Pet game id 可改為 `PET-001`。
- 程式碼 export 與型別欄位維持 TypeScript 慣例，供前後端共用。

## 開發指令

```bash
npm --workspace game-content run build
npm --workspace game-content run type-check
```
