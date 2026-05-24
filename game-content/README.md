# CryptoPets Game Content

`game-content` 是遊戲內容、語言與素材來源。前端與後端都可以引用這個 workspace，但它本身不處理玩家狀態、API、資料庫或上鏈交易。

## 職責

- 定義水豚角色、屬性、基礎數值、token metadata 參考。
- 定義材料 ID、名稱、等級、元素、基礎價格與圖片路徑。
- 定義探險森林、事件、條件、結果與獎勵倍率。
- 保存繁體中文與英文語言字典。
- 保存圖片、音訊、品牌圖、地圖與可公開的內容資料。

## 目錄

```text
src/
  capybaras.ts  水豚角色定義
  materials.ts  材料與商品定義
  stories.ts    探險劇本與事件
  lang/          zh-TW / en 語言字典
assets/
  audio/         背景音樂與音效
  branding/      Logo 與品牌視覺
  capybaras/    寵物、角色、badge、spritesheet
  goodies/      材料、道具、商品圖片
  maps/          場景地圖
```

## 素材命名規則

- 使用英文小寫 kebab-case，例如 `ice-crystal.svg`、`yuzu-bite-1.png`。
- 動畫序列使用固定 slug 加序號，例如 `yuzu-bite-1.png`、`yuzu-bite-2.png`。
- 寵物主圖使用角色 slug，例如 `capy-san.png`、`yuzu-boy.png`。
- 避免中文檔名、空白、全形符號與不明縮寫。
- 檔名改動後必須同步更新 `src/*` 內的 asset path 或前端 asset mapping。

## 語言規則

- 目前支援 `zh-TW` 與 `en`。
- 字典入口為 `src/lang/index.ts`，由 `@cryptopets/game-content` 匯出。
- 前端只保存 locale 狀態，不在元件中新增大型文案字典。

## 指令

```bash
npm --workspace game-content run build
npm --workspace game-content run type-check
```
