# CryptoPets 遊戲內容說明

`game-content` 保存遊戲內容資料、語系文案與靜態素材，供前端與後端共用。

## 內容

- `src/capybaras.ts`：寵物設定。
- `src/materials.ts`：素材定義與素材 ID 驗證。
- `src/stories.ts`：遊戲敘事資料。
- `src/lang/`：繁體中文與英文文案。
- `assets/`：品牌、寵物、地圖、道具、音訊與 example 參考圖。

## 素材背包

- `src/lang/` 已加入背包與素材背包文案。
- 前端目前依 `assets/example/Material backpack.png` 製作空格版背包。
- 測試階段不需要新增素材圖；正式階段再依鏈上素材資料補齊素材資產。

## 指令

```bash
npm --workspace game-content run build
npm --workspace game-content run type-check
```
