# Blockchain 實作規格

本文件定義 CryptoPets 的鏈上資產邊界、NFT 類型、metadata 來源、後端讀鏈責任與未完成工作。此規格不假設合約已經存在；它用來指引後續合約、indexer、metadata pipeline 與後端整合。

## 鏈上與不上鏈邊界

錢包登入不上鏈。登入流程只用錢包簽名證明玩家持有該地址：後端發 nonce，玩家使用錢包簽名，後端驗簽後簽發 JWT。此流程不需要發交易，也不需要部署玩家身份合約。

上鏈資料：

- Pet NFT ownership。
- Pet NFT `tokenId`。
- Pet NFT metadata URI。
- Material ERC-1155 token balance。
- Material ERC-1155 `tokenId`。
- Material ERC-1155 metadata URI。

不上鏈、保存在資料庫：

- 玩家暱稱。
- 遠征狀態。
- 市場掛單。
- 市場價格、上架、購買與取消狀態。
- 交易紀錄。
- 好友關係。
- 鏈上資料快取。
- 同步時間。

錢包地址會存在資料庫，作為玩家身份識別與查詢鏈上資產的 key，但錢包登入本身不代表玩家資料被寫入鏈上。

MVP 階段真正上鏈的資料只有 ERC-721 Pet NFT 與 ERC-1155 Material NFT/SFT。市場本身不上鏈，先由 Supabase 保存掛單、交易與素材餘額；正式階段可把 Supabase `inventory` 視為 ERC-1155 balance 的快取。

## Pet NFT

Pet NFT 使用 ERC-721。每一隻玩家寵物都是獨立 NFT。

鏈上應記錄：

- `tokenId`：由合約產生。
- `owner`：NFT 持有人錢包地址。
- `tokenURI`：指向 Pet metadata JSON。

metadata 建議欄位：

```json
{
  "name": "Capy-san",
  "description": "Capy-san is a citrus capybara suited for steady expeditions.",
  "image": "ipfs://...",
  "external_url": "https://...",
  "attributes": [
    { "trait_type": "Game ID", "value": "TEST-PET-001" },
    { "trait_type": "Slug", "value": "capy-san" },
    { "trait_type": "Element", "value": "citrus" },
    { "trait_type": "Stage", "value": 1 },
    { "trait_type": "IV", "value": 84 },
    { "trait_type": "HP", "value": 100 },
    { "trait_type": "ATK", "value": 75 },
    { "trait_type": "DEF", "value": 60 }
  ]
}
```

Pet metadata 來源：

- `game-content/src/capybaras.ts`：Pet NFT 的遊戲資料與 metadata 欄位來源。
- `game-content/assets/capybaras/`：Pet NFT 圖片來源。
- `game-content/metadata/pets/`：未來可新增的 Pet metadata JSON 產出目錄。

Pet 命名規則：

- Pet slug 使用 `kebab-case`，例如 `capy-san`。
- 測試期 game id 可沿用 `TEST-PET-001`。
- 正式期 game id 可改成 `PET-001`。
- 鏈上 `tokenId` 由合約產生，不手動用 game id 取代。

## Material NFT/SFT

Material 使用 ERC-1155。素材是可堆疊資產，同一種素材以同一個 `tokenId` 表示，不同玩家用 balance 區分持有數量。

鏈上應記錄：

- `tokenId`：素材 token id。
- `balanceOf(owner, tokenId)`：玩家持有數量。
- `uri(tokenId)`：指向 Material metadata JSON。

metadata 建議欄位：

```json
{
  "name": "Yuzu Bite",
  "description": "A material earned from expeditions.",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Material ID", "value": "MAT-2C" },
    { "trait_type": "Slug", "value": "yuzu-bite" },
    { "trait_type": "Element", "value": 2 },
    { "trait_type": "Grade", "value": "C" },
    { "trait_type": "Base Price", "value": 35 }
  ]
}
```

Material metadata 來源：

- `game-content/src/materials.ts`：Material ERC-1155 的遊戲資料與 metadata 欄位來源。
- `game-content/assets/goodies/`：Material 圖片來源。
- `game-content/metadata/materials/`：未來可新增的 Material metadata JSON 產出目錄。

Material 命名規則：

- Material ID 使用 `MAT-{element}{grade}`，例如 `MAT-2C`。
- Material slug 使用 `kebab-case`，例如 `yuzu-bite`。
- Material `tokenId` 應與 `game-content/src/materials.ts` 有明確 mapping。

## 不上鏈資產資料夾

以下資料夾不上鏈，只給前端、UI、內容參考或開發流程使用：

- `game-content/assets/branding/`
- `game-content/assets/maps/`
- `game-content/assets/audio/`
- `game-content/assets/example/`

## 後端讀鏈責任

後端正式階段需要讀取下列鏈上資料：

- ERC-721 `ownerOf(tokenId)` 或 indexer ownership 查詢。
- ERC-721 `tokenURI(tokenId)`。
- ERC-1155 `balanceOf(wallet, tokenId)`。
- ERC-1155 `uri(tokenId)`。
- 合約地址、chain id 與 RPC/indexer 設定。

後端不應讓前端直接決定玩家是否擁有資產。前端可連錢包與送簽名，但遊戲畫面使用的玩家資產狀態應來自後端 API。

## 後端與資料庫同步責任

資料庫負責保存不上鏈狀態與鏈上快取：

- `users.wallet`：玩家錢包地址。
- `pets`：Pet NFT 快取資料，例如 `token_id`、`contract_address`、`chain_id`、`token_uri`、遊戲屬性與經驗值。
- `inventory`：MVP 階段素材數量；正式階段可作為鏈上素材 balance 的快取。
- `market_listings`：MVP 與正式階段的市場掛單狀態，不上鏈。
- `transactions`：遊戲交易紀錄。
- `expeditions`：遠征狀態與獎勵結果。

素材餘額讀寫應透過 `MaterialBalanceProvider`：

- MVP 使用 `SupabaseMaterialBalanceProvider` 操作 `inventory`。
- 市場上架、取消、購買與遠征獎勵都不應直接散落操作 `inventory`。
- 未來接 ERC-1155 或 indexer 時，新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`，讓市場與遠征流程維持同一個介面。

MVP 市場流程：

1. 上架時用 `MaterialBalanceProvider.decrease()` 扣除賣家素材，建立 Supabase 掛單。
2. 取消時用 `MaterialBalanceProvider.increase()` 把素材加回賣家。
3. 購買時更新 Supabase 掛單與金幣，並把掛單素材加到買家餘額。
4. 以上流程不發鏈上交易。

正式階段建議流程：

1. 後端收到玩家 API request。
2. 後端用 JWT 取得玩家錢包地址。
3. 後端查詢鏈上合約或 indexer。
4. 後端驗證 ownership、balance 與 metadata URI。
5. 後端更新資料庫快取與 `syncedAt`。
6. 後端回傳 `camelCase` API response 給前端。

## API 整合原則

- 前端只呼叫後端 API，不直接用鏈上讀取結果決定遊戲狀態。
- 後端 API response 使用 `camelCase`。
- Supabase 欄位使用 `snake_case`。
- 現有 API 路徑沿用目前 route，不在本規格中改名。
- MVP 市場 API 是 Supabase DB 市場 API，不是鏈上市場交易 API。
- `GET /materials/backpack` 目前已回傳 `source`、`syncedAt` 與 `chain` meta；正式階段需接上 ERC-1155 或 indexer。

## 未完成工作清單

- [ ] 決定部署鏈與 `CHAIN_ID`。
- [ ] 決定 Pet ERC-721 合約規格與合約地址。
- [ ] 決定 Material ERC-1155 合約規格與合約地址。
- [ ] 建立 Material ID 到 ERC-1155 tokenId 的 mapping。
- [ ] 建立 Pet metadata 生成流程。
- [ ] 建立 Material metadata 生成流程。
- [ ] 建立 `game-content/metadata/pets/` 產出目錄。
- [ ] 建立 `game-content/metadata/materials/` 產出目錄。
- [ ] 將圖片與 metadata JSON 上傳到 IPFS 或 Arweave。
- [ ] 在後端接入 RPC 或 indexer。
- [ ] 將 Pet ownership 同步到資料庫快取。
- [ ] 將 Material balance 同步到資料庫快取。
- [ ] 新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`。
- [ ] 補齊鏈上同步錯誤、重試與監控。
- [ ] 補齊市場交易與鏈上素材 balance 的一致性驗證。
