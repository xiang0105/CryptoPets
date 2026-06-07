# 鏈上資料實作規格

本文件定義 CryptoPets 的鏈上資產邊界、NFT 類型、Sepolia 交易邊界、中繼資料來源、後端讀鏈責任與未完成工作。此規格不假設合約已經存在；它用來指引後續 Pet 合約、Material 合約、交易/轉帳合約、索引器、中繼資料產生流程與後端整合。

後續鏈上開發至少需要三份合約：

- Pet ERC-721 合約：代表玩家擁有的寵物 NFT。
- Material ERC-1155 合約：代表可堆疊素材 NFT/SFT。
- Sepolia 交易/轉帳合約：正式開啟交易前用來規範付款、收款、listing 對應與事件紀錄。測試階段不得由前端或後端發起實際轉帳。

## 鏈上與不上鏈邊界

錢包登入不上鏈。登入流程只用錢包簽名證明玩家持有該地址：後端發 nonce，玩家使用錢包簽名，後端驗簽後簽發 JWT。此流程不需要發交易，也不需要部署玩家身份合約。

上鏈資料：

- Pet NFT 持有權。
- Pet NFT `tokenId`。
- Pet NFT 中繼資料 URI。
- Material ERC-1155 token 餘額。
- Material ERC-1155 `tokenId`。
- Material ERC-1155 中繼資料 URI。
- 正式交易啟用後的交易付款事件，例如 listing id、付款方、收款方、Sepolia 金額、交易狀態。

不上鏈、保存在資料庫：

- 玩家暱稱。
- 遠征狀態。
- 市場掛單。
- 市場價格、上架、購買與取消狀態。
- 交易紀錄。
- 好友關係。
- 鏈上資料快取。
- 同步時間。

錢包地址會存在資料庫，作為玩家身份識別與查詢鏈上資產的索引鍵，但錢包登入本身不代表玩家資料被寫入鏈上。

MVP 階段真正上鏈的資料只有 ERC-721 Pet NFT 與 ERC-1155 Material NFT/SFT。市場本身不上鏈，先由 Supabase 保存掛單、交易與素材餘額；正式階段可把 Supabase `inventory` 視為 ERC-1155 餘額的快取。Sepolia 金額目前只作為畫面提示與市場掛單價格，不代表已付款或已轉帳。

## Pet NFT

Pet NFT 使用 ERC-721。每一隻玩家寵物都是獨立 NFT。

建議合約名稱：`CryptoPetsPet`。

建議繼承：

- `ERC721`：標準 NFT。
- `ERC721URIStorage` 或自訂 baseURI：保存或組合 token URI。
- `AccessControl` 或 `Ownable`：限制 mint、設定 URI、暫停等管理功能。
- `Pausable`：必要時暫停 mint 或轉移。

鏈上應記錄：

- `tokenId`：由合約產生。
- `owner`：NFT 持有人錢包地址。
- `tokenURI`：指向 Pet 中繼資料 JSON。

建議狀態變數：

| 變數 | 型別 | 意思 |
| --- | --- | --- |
| `name` | string | ERC-721 collection 名稱，例如 `CryptoPets Pet`。 |
| `symbol` | string | ERC-721 collection 符號，例如 `CPPET`。 |
| `baseTokenURI` | string | metadata base URI；如果每個 token URI 個別設定，可不用或只作 fallback。 |
| `nextTokenId` | uint256 | 下一個 mint 的 token id，避免手動重複。 |
| `MINTER_ROLE` | bytes32 | 允許 mint 寵物的角色，通常給後端錢包或管理錢包。 |
| `PAUSER_ROLE` | bytes32 | 允許暫停合約操作的角色。 |
| `gameIdByTokenId` | mapping(uint256 => string) | tokenId 對應遊戲內容 ID，例如 `PET-001` 或測試期 `TEST-PET-001`。 |

建議功能：

| 函式 | 權限 | 用途 |
| --- | --- | --- |
| `mintPet(address to, string gameId, string tokenURI)` | `MINTER_ROLE` | 鑄造一隻寵物 NFT 給玩家，並保存遊戲 ID 與 metadata URI。 |
| `batchMintPets(address[] to, string[] gameIds, string[] tokenURIs)` | `MINTER_ROLE` | 批量鑄造 starter 或活動寵物。 |
| `setTokenURI(uint256 tokenId, string tokenURI)` | 管理角色 | metadata URI 需要修正時使用；正式上線後建議限制或凍結。 |
| `setBaseURI(string baseURI)` | 管理角色 | 設定 metadata base URI。 |
| `pause()` / `unpause()` | `PAUSER_ROLE` | 緊急暫停或恢復合約。 |
| `ownerOf(uint256 tokenId)` | public view | 後端查詢持有者。 |
| `tokenURI(uint256 tokenId)` | public view | 後端查詢 metadata。 |

建議事件：

- `PetMinted(address indexed to, uint256 indexed tokenId, string gameId, string tokenURI)`：後端或索引器可用來同步新寵物。
- `PetTokenURIUpdated(uint256 indexed tokenId, string tokenURI)`：metadata 被更新時記錄。

中繼資料建議欄位：

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

Pet 中繼資料來源：

- `game-content/src/capybaras.ts`：Pet NFT 的遊戲資料與中繼資料欄位來源。
- `game-content/assets/capybaras/`：Pet NFT 圖片來源。
- `game-content/metadata/pets/`：未來可新增的 Pet 中繼資料 JSON 產出目錄。

Pet 命名規則：

- Pet slug 使用 `kebab-case`，例如 `capy-san`。
- 測試期 game id 可沿用 `TEST-PET-001`。
- 正式期 game id 可改成 `PET-001`。
- 鏈上 `tokenId` 由合約產生，不手動用 game id 取代。

## Material NFT/SFT

Material 使用 ERC-1155。素材是可堆疊資產，同一種素材以同一個 `tokenId` 表示，不同玩家用餘額區分持有數量。

建議合約名稱：`CryptoPetsMaterial`。

建議繼承：

- `ERC1155`：標準多 token 合約。
- `AccessControl` 或 `Ownable`：限制 mint、burn、URI 設定。
- `ERC1155Supply`：可查詢每種素材總供應量。
- `Pausable`：必要時暫停轉移或 mint。

鏈上應記錄：

- `tokenId`：素材 token id。
- `balanceOf(owner, tokenId)`：玩家持有數量。
- `uri(tokenId)`：指向 Material 中繼資料 JSON。

建議狀態變數：

| 變數 | 型別 | 意思 |
| --- | --- | --- |
| `baseURI` | string | ERC-1155 metadata URI 樣板，例如 `ipfs://.../{id}.json`。 |
| `MINTER_ROLE` | bytes32 | 允許鑄造素材的角色，通常給後端獎勵服務或活動管理錢包。 |
| `BURNER_ROLE` | bytes32 | 允許銷毀素材的角色；若玩家自己可使用素材，需明確授權流程。 |
| `PAUSER_ROLE` | bytes32 | 允許暫停合約操作的角色。 |
| `materialIdByTokenId` | mapping(uint256 => string) | tokenId 對應遊戲素材 ID，例如 `MAT-2C`。 |
| `tokenIdByMaterialId` | mapping(string => uint256) | 遊戲素材 ID 對應 tokenId，方便後端或工具查詢。 |

建議功能：

| 函式 | 權限 | 用途 |
| --- | --- | --- |
| `registerMaterial(uint256 tokenId, string materialId, string uri)` | 管理角色 | 建立 Material ID 與 tokenId、metadata URI 的對應。 |
| `mint(address to, uint256 tokenId, uint256 amount, bytes data)` | `MINTER_ROLE` | 發放素材給玩家。 |
| `mintBatch(address to, uint256[] tokenIds, uint256[] amounts, bytes data)` | `MINTER_ROLE` | 批量發放素材。 |
| `burn(address from, uint256 tokenId, uint256 amount)` | `BURNER_ROLE` 或玩家授權 | 使用、合成或消耗素材時銷毀。 |
| `balanceOf(address account, uint256 tokenId)` | public view | 後端查詢玩家素材餘額。 |
| `balanceOfBatch(address[] accounts, uint256[] tokenIds)` | public view | 後端批量查詢素材餘額。 |
| `uri(uint256 tokenId)` | public view | 後端查詢素材 metadata。 |

建議事件：

- `MaterialRegistered(uint256 indexed tokenId, string materialId, string uri)`：素材 token 對應建立。
- `MaterialMinted(address indexed to, uint256 indexed tokenId, uint256 amount)`：素材發放。
- `MaterialBurned(address indexed from, uint256 indexed tokenId, uint256 amount)`：素材消耗。

中繼資料建議欄位：

```json
{
  "name": "Yuzu Bite",
  "description": "A material earned from expeditions.",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Material ID", "value": "MAT-2C" },
    { "trait_type": "Slug", "value": "yuzu-bite" },
    { "trait_type": "Element", "value": 2 },
    { "trait_type": "Grade", "value": "C" }
  ]
}
```

Material 中繼資料來源：

- `game-content/src/materials.ts`：Material ERC-1155 的遊戲資料與中繼資料欄位來源。
- `game-content/assets/goodies/`：Material 圖片來源。
- `game-content/metadata/materials/`：未來可新增的 Material 中繼資料 JSON 產出目錄。

Material 命名規則：

- Material ID 使用 `MAT-{element}{grade}`，例如 `MAT-2C`。
- Material slug 使用 `kebab-case`，例如 `yuzu-bite`。
- Material `tokenId` 應與 `game-content/src/materials.ts` 有明確對應。

## Sepolia 交易/轉帳合約

測試階段不應有任何轉帳方式。前端不呼叫錢包交易，後端不送出交易，遠征只顯示 `0.00000000001 Sepolia` 作為提示，市場價格只保存使用者自行輸入的 Sepolia 數值。

正式開啟交易前，建議建立一份交易/轉帳合約，讓市場付款流程有可追蹤的鏈上事件，而不是讓前端直接轉帳給賣家。

建議合約名稱：`CryptoPetsTradeEscrow` 或 `CryptoPetsSepoliaTrade`。

核心責任：

- 收取買家送出的 Sepolia 測試幣。
- 將付款與 Supabase listing id、買家、賣家、金額綁定。
- 防止同一筆 listing 重複付款或重放交易。
- 發出可被後端或索引器監聽的事件。
- 支援管理員取消、退款或放款策略。

建議狀態變數：

| 變數 | 型別 | 意思 |
| --- | --- | --- |
| `admin` 或 `DEFAULT_ADMIN_ROLE` | address / role | 可暫停、退款、設定 fee recipient 的管理者。 |
| `treasury` | address payable | 若未來收平台費，平台費接收地址；測試階段可不啟用。 |
| `feeBps` | uint16 | 平台費率，basis points，100 = 1%。若目前不收費則固定 0。 |
| `payments` | mapping(bytes32 => Payment) | listing payment id 對應付款狀態。 |
| `usedNonces` | mapping(address => mapping(uint256 => bool)) | 防止同一買家重複使用 nonce。 |
| `paused` | bool | 緊急停止付款入口。 |

建議 `Payment` 結構：

| 欄位 | 型別 | 意思 |
| --- | --- | --- |
| `listingId` | bytes32 | 後端 listing id 的 hash 或 bytes32 表示，用來對應 Supabase `market_listings.id`。 |
| `buyer` | address | 付款方錢包。 |
| `seller` | address payable | 收款方錢包。 |
| `amount` | uint256 | Sepolia wei 金額。 |
| `fee` | uint256 | 平台費，若 `feeBps=0` 則為 0。 |
| `status` | enum | `None`、`Paid`、`Released`、`Refunded`、`Cancelled`。 |
| `createdAt` | uint64 | 付款建立時間。 |

建議功能：

| 函式 | 權限 | 用途 |
| --- | --- | --- |
| `pay(bytes32 listingId, address payable seller, uint256 nonce)` | buyer payable | 買家付款。`msg.value` 必須等於後端要求的 Sepolia wei 金額。 |
| `release(bytes32 listingId)` | 管理角色或自動規則 | 確認素材交付後放款給賣家。 |
| `refund(bytes32 listingId)` | 管理角色 | listing 失敗、素材交付失敗或爭議時退款給買家。 |
| `cancel(bytes32 listingId)` | 管理角色 | 標記付款取消，避免重複處理。 |
| `setFeeBps(uint16 feeBps)` | 管理角色 | 設定平台費率，上限應有保護。 |
| `setTreasury(address payable treasury)` | 管理角色 | 設定平台費接收地址。 |
| `pause()` / `unpause()` | 管理角色 | 緊急暫停或恢復付款。 |
| `getPayment(bytes32 listingId)` | public view | 後端查詢付款狀態。 |

建議事件：

- `TradePaid(bytes32 indexed listingId, address indexed buyer, address indexed seller, uint256 amount, uint256 fee)`：買家已付款。
- `TradeReleased(bytes32 indexed listingId, address indexed seller, uint256 sellerAmount, uint256 fee)`：已放款。
- `TradeRefunded(bytes32 indexed listingId, address indexed buyer, uint256 amount)`：已退款。
- `TradeCancelled(bytes32 indexed listingId)`：交易取消。
- `FeeUpdated(uint16 feeBps)`：平台費率更新。
- `TreasuryUpdated(address indexed treasury)`：平台收款地址更新。

後端整合注意事項：

- 後端應在 DB listing 建立後產生可驗證的 `listingId` 與價格，正式交易時前端只能拿後端回傳的交易參數送錢包。
- 後端應監聽 `TradePaid` 事件，確認 buyer、seller、amount、listingId 都與 DB 一致後，才更新市場狀態。
- 素材交付成功後才允許 `release`；如果素材交付失敗，應走 `refund`。
- 測試階段這整段流程保持未啟用，不可用假交易或本地扣款取代。

## 不上鏈資產資料夾

以下資料夾不上鏈，只給前端介面、內容參考或開發流程使用：

- `game-content/assets/branding/`
- `game-content/assets/maps/`
- `game-content/assets/audio/`
- `game-content/assets/example/`

## 後端讀鏈責任

後端正式階段需要讀取下列鏈上資料：

- ERC-721 `ownerOf(tokenId)` 或索引器持有權查詢。
- ERC-721 `tokenURI(tokenId)`。
- ERC-1155 `balanceOf(wallet, tokenId)`。
- ERC-1155 `uri(tokenId)`。
- Sepolia 交易合約 `getPayment(listingId)` 或事件索引結果。
- `TradePaid`、`TradeReleased`、`TradeRefunded`、`TradeCancelled` 事件。
- 合約地址、chain id 與 RPC/索引器設定。

後端不應讓前端直接決定玩家是否擁有資產。前端可連錢包與送簽名，但遊戲畫面使用的玩家資產狀態應來自後端 API。

## 後端與資料庫同步責任

資料庫負責保存不上鏈狀態與鏈上快取：

- `users.wallet`：玩家錢包地址。
- `pets`：Pet NFT 快取資料，例如 `token_id`、`contract_address`、`chain_id`、`token_uri`、遊戲屬性與經驗值。
- `inventory`：MVP 階段素材數量；正式階段可作為鏈上素材餘額的快取。
- `market_listings`：MVP 與正式階段的市場掛單狀態，不上鏈。
- `transactions`：遊戲交易紀錄。
- `expeditions`：遠征狀態與獎勵結果。
- `chain_transactions` 或未來等價資料表：正式交易啟用後保存 tx hash、listing id、事件狀態、確認區塊與同步錯誤。

素材餘額讀寫應透過 `MaterialBalanceProvider`：

- MVP 使用 `SupabaseMaterialBalanceProvider` 操作 `inventory`。
- 市場上架、取消、購買與遠征獎勵都不應直接散落操作 `inventory`。
- 未來接 ERC-1155 或索引器時，新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`，讓市場與遠征流程維持同一個介面。

MVP 市場流程：

1. 上架時用 `MaterialBalanceProvider.decrease()` 扣除賣家素材，建立 Supabase 掛單。
2. 取消時用 `MaterialBalanceProvider.increase()` 把素材加回賣家。
3. 購買時更新 Supabase 掛單，並把掛單素材加到買家餘額。測試階段只記錄使用者自行輸入的 Sepolia 價格，不扣款、不轉帳。
4. 以上流程不發鏈上交易。

正式階段建議流程：

1. 後端收到玩家 API 請求。
2. 後端用 JWT 取得玩家錢包地址。
3. 後端查詢鏈上合約或索引器。
4. 後端驗證持有權、餘額與中繼資料 URI。
5. 後端更新資料庫快取與 `syncedAt`。
6. 後端回傳 `camelCase` API 回應給前端。

正式市場付款建議流程：

1. 賣家上架素材，後端扣除或鎖定素材，建立 DB listing。
2. 買家按購買，後端回傳 listing id、seller address、Sepolia wei 金額、chain id、交易合約地址。
3. 前端請錢包呼叫交易合約 `pay()`。
4. 後端監聽或查詢 `TradePaid` 事件，確認付款資訊與 DB listing 一致。
5. 後端交付素材給買家，將 listing 改為 `sold`。
6. 後端或管理流程呼叫 `release()` 放款；若交付失敗則呼叫 `refund()`。

## API 整合原則

- 前端只呼叫後端 API，不直接用鏈上讀取結果決定遊戲狀態。
- 後端 API 回應使用 `camelCase`。
- Supabase 欄位使用 `snake_case`。
- 現有 API 路徑沿用目前路由，不在本規格中改名。
- MVP 市場 API 是 Supabase DB 市場 API，不是鏈上市場交易 API。
- `GET /materials/backpack` 目前已回傳 `source`、`syncedAt` 與鏈上狀態資料；正式階段需接上 ERC-1155 或索引器。
- 正式交易 API 需要新增明確的交易準備、交易確認、交易狀態查詢 endpoint；不應讓前端自行組裝 seller、amount 或 listing id。

## 未完成工作清單

- [ ] 決定部署鏈與 `CHAIN_ID`。
- [ ] 決定 Pet ERC-721 合約規格與合約地址。
- [ ] 決定 Material ERC-1155 合約規格與合約地址。
- [ ] 決定 Sepolia 交易/轉帳合約規格與合約地址。
- [ ] 建立 Material ID 到 ERC-1155 tokenId 的對應。
- [ ] 建立 Pet game id 到 ERC-721 tokenId 的對應。
- [ ] 建立 Pet 中繼資料生成流程。
- [ ] 建立 Material 中繼資料生成流程。
- [ ] 建立 `game-content/metadata/pets/` 產出目錄。
- [ ] 建立 `game-content/metadata/materials/` 產出目錄。
- [ ] 將圖片與中繼資料 JSON 上傳到 IPFS 或 Arweave。
- [ ] 在後端接入 RPC 或索引器。
- [ ] 將 Pet 持有權同步到資料庫快取。
- [ ] 將 Material 餘額同步到資料庫快取。
- [ ] 將 Sepolia 交易付款事件同步到資料庫。
- [ ] 新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`。
- [ ] 補齊鏈上同步錯誤、重試與監控。
- [ ] 補齊市場交易與鏈上素材餘額的一致性驗證。
