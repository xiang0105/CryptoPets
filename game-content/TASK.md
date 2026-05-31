# 遊戲內容任務

`game-content` 是前端與後端共同使用的遊戲資料來源，包含寵物定義、素材定義、遠征森林、劇本事件、語系文字與視覺/音訊資產。這裡的 ID、slug、文字與 asset path 必須穩定，避免前後端資料對不起來。

## Package 與匯出

- [x] 建立 `game-content` workspace。
  - 驗收：`package.json`、`tsconfig.json` 可透過 workspace build。
- [x] 建立 package exports。
  - 驗收：前端與後端可從 `@cryptopets/game-content` import 定義。
- [x] 匯出寵物、素材、遠征與語系資料。
  - 驗收：`src/index.ts` 集中 export 主要內容。
- [ ] 建立 public API 檢查。
  - 驗收：避免未預期的內部資料被外部 package 直接依賴。

## 寵物內容

- [x] 建立 starter capybara 定義。
  - 驗收：`src/capybaras.ts` 定義 sakiko、MAX、SONORATO、CANESAN。
- [x] 定義寵物基本屬性。
  - 驗收：每隻寵物包含 id、name、slug、element、stage、tokenURI、stats。
- [x] 定義寵物介紹文字。
  - 驗收：profile 提供 zh/en 文字。
- [x] 定義隊長技能與技能資料。
  - 驗收：leaderSkill 與 skills 可供前端顯示。
- [x] 建立寵物查找表。
  - 驗收：`starterCapybaraById`、`starterCapybaraByName` 可供前端 map 後端 pets。
- [ ] 補齊正式 Pet NFT metadata 對應。
  - 驗收：game id、tokenId、metadata URI、asset path 有穩定 mapping。
- [ ] 補齊寵物內容 validation。
  - 驗收：id/slug/name 不重複，stats 合法，asset 存在。

## 素材內容

- [x] 建立素材定義。
  - 驗收：`src/materials.ts` 匯出 MVP 素材列表。
- [x] 建立素材 ID 規則。
  - 驗收：素材 ID 使用 `MAT-{element}{grade}`，例如 `MAT-2C`。
- [x] 建立 `isKnownMaterialId()`。
  - 驗收：後端市場上架 validation 可用它檢查素材 ID。
- [x] 定義素材顯示資料。
  - 驗收：每個素材包含 name、slug、element、grade、description、basePrice。
- [ ] 補齊 MVP 遠征與市場所需素材。
  - 驗收：遠征獎勵、背包、上架、購買流程都有足夠素材可測。
- [ ] 建立 Material ID 到 ERC-1155 tokenId mapping。
  - 驗收：鏈上接入時可由 material id 找到 token id。
- [ ] 補齊素材內容 validation。
  - 驗收：id/slug 不重複，grade 合法，basePrice 合理，asset 存在。

## 遠征森林與劇本

- [x] 建立遠征森林定義。
  - 驗收：`orange`、`apple`、`snow-peach` 三個森林存在。
- [x] 定義森林基礎資料。
  - 驗收：每個森林包含 id、asset、difficulty、durationSeconds、reward、name、summary。
- [x] 建立共通劇本事件。
  - 驗收：森林可共用事件，避免重複維護。
- [x] 建立森林專屬事件。
  - 驗收：orange/apple/snow-peach 都有自己的追加事件。
- [x] 定義事件條件。
  - 驗收：支援 leaderElement、teamPetName、chancePercent、teamPower/teamHp/teamAtk/teamDef 等條件。
- [x] 定義事件結果文字與 reward multiplier。
  - 驗收：前端可依隊伍狀態顯示不同劇情文字。
- [x] 對齊後端 ExpeditionType。
  - 驗收：森林 id 與 shared `ExpeditionType`、後端 DB constraint 一致。
- [ ] 補齊劇本資料 schema/type-level validation。
  - 驗收：每個事件至少有 setup/outcome，條件 operator/value 合法。
- [ ] 補齊劇本平衡檢查。
  - 驗收：duration、difficulty、reward、條件門檻有一致規則。

## 語系文字

- [x] 建立語系資料夾。
  - 驗收：`src/lang/` 提供 types、zh-TW、en、index。
- [x] 建立 `GameMessages` type。
  - 驗收：zh/en 必須符合相同 key structure。
- [x] 建立英文 UI 文案。
  - 驗收：前端 help、nav、home、pets、store、inventory 需要的英文 key 可用。
- [x] 建立繁中 UI 文案。
  - 驗收：前端 help、nav、home、pets、store、inventory 需要的繁中 key 可用。
- [x] 更新文案為後端資料來源敘述。
  - 驗收：不再描述 frontend-only testing flow 或前端發放角色。
- [ ] 清理中文亂碼。
  - 驗收：所有 zh-TW 文案在 Markdown、Vue 畫面與 build output 中可正常閱讀。
- [ ] 補齊文案 key coverage tests。
  - 驗收：新增 key 時 zh/en 都必須補齊。

## 視覺與音訊資產

- [x] 建立 `assets/capybaras/`。
  - 驗收：寵物圖片可由前端 asset map 使用。
- [x] 建立 `assets/goodies/`。
  - 驗收：素材圖示資產已集中管理。
- [x] 建立 `assets/maps/`。
  - 驗收：Home/Store 使用的地圖圖可被前端 import。
- [x] 建立 `assets/branding/`。
  - 驗收：品牌 logo 可供 App shell 使用。
- [x] 建立 `assets/audio/`。
  - 驗收：背景音樂可供前端播放。
- [x] 建立 `assets/example/`。
  - 驗收：原型與參考圖集中保存。
- [ ] 建立 asset existence validation。
  - 驗收：內容定義引用的 slug、iconKey、asset path 都能找到檔案。
- [ ] 整理 example 資產用途。
  - 驗收：明確區分正式可用資產與僅供設計參考的資產。

## Metadata 與鏈上對應

- [ ] 建立 `game-content/metadata/pets/`。
  - 驗收：每個 Pet NFT metadata JSON 可由 id/tokenId 產生或查找。
- [ ] 建立 `game-content/metadata/materials/`。
  - 驗收：每個 Material NFT/SFT metadata JSON 可由 material id/tokenId 產生或查找。
- [ ] 建立 Pet metadata JSON schema。
  - 驗收：name、description、image、attributes 格式符合 ERC-721 metadata 慣例。
- [ ] 建立 Material metadata JSON schema。
  - 驗收：name、description、image、attributes 格式符合 ERC-1155 metadata 慣例。
- [ ] 建立 Pet game id 與 ERC-721 metadata mapping。
  - 驗收：後端可由鏈上 token 對應回遊戲內 pet definition。
- [ ] 建立 Material ID 與 ERC-1155 tokenId mapping。
  - 驗收：後端可由鏈上 token 對應回素材 definition。
- [ ] 規劃 IPFS/Arweave 上傳流程。
  - 驗收：metadata 與圖片有不可變 URI，並能寫入合約或 indexer。

## 內容品質與測試

- [ ] 補齊內容資料單元測試。
  - 驗收：寵物、素材、遠征、語系資料都可被測試掃描。
- [ ] 補齊 ID/slug collision tests。
  - 驗收：重複 id、slug、material id、forest id 會讓測試失敗。
- [ ] 補齊 shared type compatibility tests。
  - 驗收：森林 id 與 shared/backend/frontend 的 union type 不分裂。
- [ ] 補齊 asset path tests。
  - 驗收：內容定義引用的圖片、音訊、地圖都存在。
- [ ] 建立內容變更 checklist。
  - 驗收：新增素材/寵物/森林時，必須同步更新定義、語系、資產、metadata、後端 validation。
