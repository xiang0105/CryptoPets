# CryptoPets Backend API

本文件描述 `backend` 目前提供的全部 API。所有鏈上數值為避免 JavaScript number 溢位，回傳與 request 都優先使用十進位字串。

## 基本設定

- Base URL：`http://localhost:3400`
- Content-Type：`application/json`
- Chain：Sepolia，`CHAIN_ID=11155111`
- Admin API header：`x-admin-api-key: <ADMIN_API_KEY>`
- 玩家交易 API 只回傳 `to`、`data`、`value`、`chainId`，由前端錢包簽名送出。
- Admin API 與遠征 claim 發素材會由後端使用 `DEPLOYER_PRIVATE_KEY` 送鏈上交易。
- `.env`、私鑰、API key、SQLite database 不可 commit。

## 環境變數

```env
PORT=3400
CORS_ORIGIN=http://localhost:5400
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CHAIN_ID=11155111
CRYPTO_PETS_ADDRESS=0x8F71AddC5b56D148727d129F54e31d24f632CeD0
CRYPTO_MATERIALS_ADDRESS=0xA6E9ec01E2fb1e82db2602719c13D2cC15446E56
PETS_FROM_BLOCK=11009607
MATERIALS_FROM_BLOCK=11009614
DEPLOYER_PRIVATE_KEY=replace-with-owner-private-key
ADMIN_API_KEY=replace-with-a-long-random-admin-key
EXPEDITION_DB_PATH=backend/data/cryptopets.sqlite
```

## 共用格式

### Error

```json
{
  "error": "INVALID_REQUEST",
  "message": "tokenId must be a decimal integer string"
}
```

常見錯誤碼：

- `INVALID_REQUEST`：request 格式錯誤。
- `INVALID_JSON`：JSON body 格式錯誤。
- `NOT_FOUND`：路由不存在。
- `CHAIN_CALL_FAILED`：鏈上查詢失敗。
- `ADMIN_API_KEY_NOT_CONFIGURED`：未設定 `ADMIN_API_KEY`。
- `ADMIN_API_KEY_INVALID`：admin header 錯誤。
- `DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED`：需要後端 owner 私鑰但未設定。
- `DEPLOYER_PRIVATE_KEY_INVALID`：後端 owner 私鑰格式錯誤。
- `INVALID_AUTH_CHALLENGE`：遠征簽名 challenge 不存在或不一致。
- `AUTH_CHALLENGE_EXPIRED`：遠征 nonce 已過期。
- `AUTH_CHALLENGE_USED`：遠征 nonce 已被使用。
- `INVALID_SIGNATURE`：簽名無效或不屬於該 wallet。
- `ACTIVE_EXPEDITION_EXISTS`：同一 wallet 已有進行中的遠征。
- `PET_NOT_OWNED`：指定 pet 不屬於該 wallet。
- `EXPEDITION_NOT_FOUND`：找不到遠征。
- `EXPEDITION_WALLET_MISMATCH`：遠征不屬於該 wallet。
- `EXPEDITION_ALREADY_CLAIMED`：遠征不能重複 claim。
- `EXPEDITION_NOT_READY`：遠征尚未到結算時間。

### TransactionRequest

玩家交易 API 回傳：

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0",
  "chainId": 11155111
}
```

### SentTransaction

Admin API 回傳：

```json
{
  "transaction": {
    "hash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "chainId": 11155111,
    "nonce": 1
  }
}
```

## 基本 API

### `GET /health`

檢查後端是否啟動。

Response：

```json
{
  "status": "ok"
}
```

### `GET /contracts`

回傳目前後端連接的合約地址與事件掃描起始 block。

Response：

```json
{
  "chainId": 11155111,
  "pets": {
    "address": "0x8F71AddC5b56D148727d129F54e31d24f632CeD0",
    "fromBlock": 11009607
  },
  "materials": {
    "address": "0xA6E9ec01E2fb1e82db2602719c13D2cC15446E56",
    "fromBlock": 11009614
  }
}
```

## Pet 查詢 API

### `GET /pets/total`

Response：

```json
{
  "total": "3"
}
```

### `GET /pets/:tokenId`

`tokenId` 必須是大於 0 的十進位整數。

Response：

```json
{
  "pet": {
    "tokenId": "1",
    "owner": "0x...",
    "name": "Yuzu",
    "iv": 120,
    "level": "3",
    "skin": 0,
    "listing": null
  }
}
```

### `GET /wallets/:wallet/pets`

Response：

```json
{
  "wallet": "0x...",
  "pets": [
    {
      "tokenId": "1",
      "owner": "0x...",
      "name": "Yuzu",
      "iv": 120,
      "level": "3",
      "skin": 0,
      "listing": null
    }
  ]
}
```

### `GET /market/pets`

從鏈上事件掃描並以目前合約狀態確認，只回傳 active listings。

Response：

```json
{
  "listings": [
    {
      "tokenId": "1",
      "seller": "0x...",
      "priceWei": "1000000000000000"
    }
  ]
}
```

### `GET /market/pets/:tokenId`

Response：

```json
{
  "listing": {
    "tokenId": "1",
    "seller": "0x...",
    "priceWei": "1000000000000000"
  }
}
```

## Material 查詢 API

### `GET /materials/:materialId/balances/:wallet`

Response：

```json
{
  "wallet": "0x...",
  "balance": {
    "materialId": "1",
    "amount": "5"
  }
}
```

### `GET /wallets/:wallet/materials?ids=1,2`

`ids` 為逗號分隔的 `materialId` 清單。

Response：

```json
{
  "wallet": "0x...",
  "balances": [
    {
      "materialId": "1",
      "amount": "5"
    },
    {
      "materialId": "2",
      "amount": "0"
    }
  ]
}
```

### `GET /market/materials`

Response：

```json
{
  "listings": [
    {
      "listingId": "1",
      "seller": "0x...",
      "materialId": "1",
      "amount": "3",
      "priceWei": "1000000000000000"
    }
  ]
}
```

### `GET /market/materials/:listingId`

Response：

```json
{
  "listing": {
    "listingId": "1",
    "seller": "0x...",
    "materialId": "1",
    "amount": "3",
    "priceWei": "1000000000000000"
  }
}
```

## 玩家交易參數 API

這些 API 不會代送交易，只產生前端錢包需要簽名送出的 transaction request。

### `POST /tx/pets/approve`

Request：

```json
{
  "approved": "0x...",
  "tokenId": "1"
}
```

`approved` 也可用 `to` 代替。

### `POST /tx/pets/set-approval-for-all`

Request：

```json
{
  "operator": "0x...",
  "approved": true
}
```

### `POST /tx/pets/transfer`

Request：

```json
{
  "from": "0x...",
  "to": "0x...",
  "tokenId": "1"
}
```

### `POST /tx/pets/safe-transfer`

Request：

```json
{
  "from": "0x...",
  "to": "0x...",
  "tokenId": "1",
  "data": "0x"
}
```

`data` 可省略，預設為 `0x`。

### `POST /tx/pets/sell-cloth`

Request：

```json
{
  "clothId": "1",
  "from": "0x...",
  "to": "0x...",
  "fromPetId": "1",
  "toPetId": "2"
}
```

`clothId` 範圍為 `0` 到 `7`。

### `POST /tx/pets/list`

Request：

```json
{
  "tokenId": "1",
  "priceWei": "1000000000000000"
}
```

### `POST /tx/pets/cancel-listing`

Request：

```json
{
  "tokenId": "1"
}
```

### `POST /tx/pets/buy`

後端會讀取目前 listing 價格並放入回傳的 `value`。

Request：

```json
{
  "tokenId": "1"
}
```

### `POST /tx/materials/set-approval-for-all`

Request：

```json
{
  "operator": "0x...",
  "approved": true
}
```

### `POST /tx/materials/transfer`

Request：

```json
{
  "from": "0x...",
  "to": "0x...",
  "materialId": "1",
  "amount": "3",
  "data": "0x"
}
```

`data` 可省略，預設為 `0x`。

### `POST /tx/materials/batch-transfer`

Request：

```json
{
  "from": "0x...",
  "to": "0x...",
  "materialIds": ["1", "2"],
  "amounts": ["3", "1"],
  "data": "0x"
}
```

`materialIds` 與 `amounts` 長度必須相同，所有 amount 必須大於 0。

### `POST /tx/materials/list`

Request：

```json
{
  "materialId": "1",
  "amount": "3",
  "priceWei": "1000000000000000"
}
```

### `POST /tx/materials/cancel-listing`

Request：

```json
{
  "listingId": "1"
}
```

### `POST /tx/materials/buy`

後端會讀取目前 listing 價格並放入回傳的 `value`。

Request：

```json
{
  "listingId": "1"
}
```

## Admin API

所有 admin API 都需要 header：

```http
x-admin-api-key: <ADMIN_API_KEY>
```

這些 API 會由後端使用 `DEPLOYER_PRIVATE_KEY` 送鏈上交易。

### `POST /admin/pets`

新增 pet。

Request：

```json
{
  "name": "Yuzu",
  "to": "0x...",
  "iv": "120"
}
```

`iv` 最大為 `255`。

### `POST /admin/pets/:tokenId/level`

修改 pet level。

Request：

```json
{
  "level": "5"
}
```

### `POST /admin/pets/:tokenId/cloth`

替 pet 加 cloth。後端會先讀 `ownerOf(tokenId)`。

Request：

```json
{
  "clothId": "1"
}
```

`clothId` 範圍為 `0` 到 `7`。

### `POST /admin/materials/increase`

增加素材餘額。

Request：

```json
{
  "to": "0x...",
  "materialId": "1",
  "amount": "3"
}
```

### `POST /admin/materials/decrease`

減少素材餘額。

Request：

```json
{
  "from": "0x...",
  "materialId": "1",
  "amount": "3"
}
```

## 遠征 API

遠征完全在後端執行，不修改 Solidity 合約的 pet 狀態。只有 claim 成功且素材數量大於 0 時，後端會呼叫 `CryptoMaterials.increaseMaterial(wallet, materialId, amount)` 發放鏈上素材，並等待 1 confirmation 後才標記 claimed。

### 遠征簽名流程

1. 前端呼叫 `POST /auth/nonce` 取得 `nonce`、`message`、`expiresAt`。
2. 前端錢包必須對 `message` 原文簽名。
3. 前端呼叫 `POST /start-expedition` 或 `POST /claim-reward`，附上 `nonce`、`message`、`signature`。
4. 後端會驗證 nonce 未過期、未使用、wallet/action/payload hash/message/signature 全部一致。
5. nonce 驗證成功後會被標記 used，不能重放。

### 遠征規則

- `expeditionType` 只允許 `orange`、`apple`、`snow-peach`。
- 同一個 wallet 同時間只能有一趟 `started` 遠征。
- 開始遠征時會驗證所有 `petIds` 的鏈上 owner 都等於該 wallet。
- 開始遠征時會保存每隻 pet 的 `tokenId`、`owner`、`name`、`level`、`iv` snapshot。
- `totalLevel = sum(level)`。
- `sumIv = sum(iv)`。
- 每個事件成功率：`clamp(30 + effectiveTotalLevel * 8 - forest.difficulty * 10, 10, 95)`。
- 每個事件 roll：`sha256(expeditionId:eventId:index)` 轉成 `0-99`。
- `roll < chance` 表示成功。
- 失敗事件若 outcome tags 包含 `damage-display`、`poison`、`slow`、`stun`，後續事件的 `effectiveTotalLevel -= 1`，最小為 `0`。
- 暫時 level penalty 只影響本趟遠征事件判定，不寫回 pet。
- 只有成功事件會給素材。
- 每個成功事件素材量：`1 + floor(sumIv / 200)`。
- `orange` 與 `apple` 發 `materialId "1"`。
- `snow-peach` 發 `materialId "2"`。

### `POST /auth/nonce`

Start request：

```json
{
  "wallet": "0x...",
  "action": "start-expedition",
  "petIds": ["1", "2"],
  "expeditionType": "orange"
}
```

Claim request：

```json
{
  "wallet": "0x...",
  "action": "claim-reward",
  "expeditionId": "expedition-id"
}
```

Response：

```json
{
  "nonce": "uuid",
  "message": "CryptoPets Expedition\nAction: start-expedition\nWallet: 0x...\nPayload Hash: 0x...\nNonce: uuid\nExpires At: 2026-01-01T00:05:00.000Z",
  "expiresAt": "2026-01-01T00:05:00.000Z"
}
```

### `POST /start-expedition`

Request：

```json
{
  "wallet": "0x...",
  "petIds": ["1", "2"],
  "expeditionType": "orange",
  "nonce": "uuid",
  "message": "CryptoPets Expedition\n...",
  "signature": "0x..."
}
```

Response：

```json
{
  "id": "uuid",
  "wallet": "0x...",
  "petIds": ["1", "2"],
  "expeditionType": "orange",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "endsAt": "2026-01-01T00:00:45.000Z",
  "status": "started",
  "reward": null,
  "totalLevel": 7,
  "sumIv": 300,
  "events": [
    {
      "index": 0,
      "eventId": "common-giant-beetle",
      "outcomeId": "beetle-high-hp",
      "success": true,
      "chance": 76,
      "roll": 12,
      "effectiveTotalLevel": 7,
      "levelPenaltyApplied": 0,
      "materialId": "1",
      "materialAmount": 2,
      "message": {
        "zh": "事件文字",
        "en": "Event text"
      },
      "tags": []
    }
  ],
  "logs": [
    {
      "id": "uuid",
      "expeditionId": "uuid",
      "at": "2026-01-01T00:00:00.000Z",
      "message": {
        "zh": "開始橘子森林遠征。",
        "en": "Started Orange Forest."
      },
      "variant": "notice"
    }
  ],
  "materialMintTxHash": null
}
```

### `POST /claim-reward`

Request：

```json
{
  "wallet": "0x...",
  "expeditionId": "uuid",
  "nonce": "uuid",
  "message": "CryptoPets Expedition\n...",
  "signature": "0x..."
}
```

Response：

```json
{
  "id": "uuid",
  "wallet": "0x...",
  "petIds": ["1", "2"],
  "expeditionType": "orange",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "endsAt": "2026-01-01T00:00:45.000Z",
  "status": "claimed",
  "reward": {
    "exp": 0,
    "sepoliaAmount": "0",
    "materials": [
      {
        "id": "1",
        "count": 8
      }
    ]
  },
  "totalLevel": 7,
  "sumIv": 300,
  "events": [],
  "logs": [],
  "materialMintTxHash": "0x..."
}
```

若 `reward.materials` 為空，`materialMintTxHash` 會是 `null`，後端不會送 `increaseMaterial`。

### `GET /wallets/:wallet/expedition`

回傳目前 active expedition，沒有則回 `null`。

Response：

```json
{
  "id": "uuid",
  "wallet": "0x...",
  "petIds": ["1"],
  "expeditionType": "orange",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "endsAt": "2026-01-01T00:00:45.000Z",
  "status": "started",
  "reward": null,
  "totalLevel": 3,
  "sumIv": 120,
  "events": [],
  "logs": [],
  "materialMintTxHash": null
}
```

### `GET /wallets/:wallet/expedition/logs`

回傳該 wallet 的遠征 log，依時間排序，最多 100 筆。

Response：

```json
[
  {
    "id": "uuid",
    "expeditionId": "uuid",
    "at": "2026-01-01T00:00:00.000Z",
    "message": {
      "zh": "開始橘子森林遠征。",
      "en": "Started Orange Forest."
    },
    "variant": "notice"
  }
]
```
