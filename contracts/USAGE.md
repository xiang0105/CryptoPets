# CryptoPets Contracts 使用指南

本資料夾目前有兩個獨立合約：

- `CryptoPets.sol`：寵物合約，負責 pet 建立、查詢、cloth、ERC-721 轉移、pet 買賣。
- `CryptoMaterials.sol`：素材合約，負責 material 增減、查詢、ERC-1155 轉移、material 買賣。

兩個合約彼此沒有 import，也不互相依賴。玩家只是用同一個錢包地址同時持有 pet 與 material。

## 部署

部署順序沒有要求，可以先部署任一份：

1. 部署 `CryptoPets`
2. 部署 `CryptoMaterials`

兩份合約的 `owner` 都是各自部署者。只有合約 `owner` 可以做管理操作，例如建立 pet、設定 pet level、增加或減少素材。

## CryptoPets

### 建立寵物

只有合約 `owner` 可以呼叫：

```solidity
addPet("momo", playerAddress, 88)
```

效果：

- 建立一隻新 pet。
- 自動產生新的 `petId`。
- `petId` 同時也是 ERC-721 tokenId。
- 初始 `petLevel` 是 `1`。
- 初始 `petSkin` 是 `0`。

寵物資料：

```solidity
struct PetAttribute {
    uint256 petId;
    string petName;
    uint8 petIv;
    uint256 petLevel;
    uint8 petSkin;
}
```

### 查詢寵物

查目前總共建立過幾隻 pet：

```solidity
getTotalPet()
```

查某個地址目前持有哪些 petId：

```solidity
getUserPetId(playerAddress)
```

查呼叫者自己的某隻 pet：

```solidity
getPet(petId)
```

查呼叫者自己的某隻 pet，且不是 owner 會 revert：

```solidity
getPetAttribute(petId)
```

查 ERC-721 owner：

```solidity
ownerOf(petId)
```

查某地址持有幾隻 pet：

```solidity
balanceOf(playerAddress)
```

### 設定等級

只有合約 `owner` 可以呼叫：

```solidity
setPetLevel(petId, level)
```

限制：

- `level` 必須大於 `0`。
- 這裡的 `owner` 是合約 owner，不是 pet owner。

### Cloth

只有合約 `owner` 可以替 pet 加 cloth：

```solidity
addCloth(clothId, playerAddress, petId)
```

限制：

- `clothId` 必須是 `0` 到 `7`。
- cloth 存在 `petSkin` bitmask 裡。

玩家或被授權者可以把 cloth 從一隻 pet 移到另一隻 pet：

```solidity
sellCloth(clothId, fromAddress, toAddress, fromPetId, toPetId)
```

注意：`sellCloth` 沿用草稿名稱，但它不處理付款，只是轉移 cloth bit。

### Pet 轉移

ERC-721 標準轉移：

```solidity
transferFrom(from, to, petId)
```

Safe transfer：

```solidity
safeTransferFrom(from, to, petId)
safeTransferFrom(from, to, petId, data)
```

授權單一 pet：

```solidity
approve(operator, petId)
```

授權 operator 管理所有 pet：

```solidity
setApprovalForAll(operator, true)
```

取消 operator 授權：

```solidity
setApprovalForAll(operator, false)
```

### Pet 買賣

賣家掛賣自己的 pet：

```solidity
listPet(petId, priceWei)
```

例如價格是 `0.01 ETH`：

```solidity
listPet(petId, 10000000000000000)
```

賣家取消掛單：

```solidity
cancelPetListing(petId)
```

買家購買：

```solidity
buyPet(petId)
```

購買時必須附上剛好等於 `priceWei` 的原生幣。

成交後：

- pet 轉給買家。
- ETH 轉給賣家。
- 掛單刪除。

## CryptoMaterials

### 增加素材

只有合約 `owner` 可以呼叫。

ERC-1155 語意上的 mint：

```solidity
mintMaterial(playerAddress, materialId, amount)
```

直接增加素材：

```solidity
increaseMaterial(playerAddress, materialId, amount)
```

兩者目前效果相同，都會增加指定地址的素材數量。

### 減少素材

只有合約 `owner` 可以呼叫：

```solidity
decreaseMaterial(playerAddress, materialId, amount)
```

限制：

- `amount` 必須大於 `0`。
- 玩家素材餘額必須足夠。

### 查詢素材

查某地址的某種素材數量：

```solidity
balanceOf(playerAddress, materialId)
```

批次查詢：

```solidity
balanceOfBatch(accounts, materialIds)
```

### Material 轉移

ERC-1155 單筆轉移：

```solidity
safeTransferFrom(from, to, materialId, amount, data)
```

ERC-1155 批次轉移：

```solidity
safeBatchTransferFrom(from, to, materialIds, amounts, data)
```

授權 operator 管理所有 material：

```solidity
setApprovalForAll(operator, true)
```

取消 operator 授權：

```solidity
setApprovalForAll(operator, false)
```

### Material 買賣

賣家掛賣素材：

```solidity
listMaterial(materialId, amount, priceWei)
```

掛賣時，素材會先轉進 `CryptoMaterials` 合約保管。

賣家取消掛單：

```solidity
cancelMaterialListing(listingId)
```

取消後，素材會退回賣家。

買家購買：

```solidity
buyMaterial(listingId)
```

購買時必須附上剛好等於 `priceWei` 的原生幣。

成交後：

- 素材轉給買家。
- ETH 轉給賣家。
- 掛單變成 inactive。

## 最小測試流程

### Pet

```text
1. owner 呼叫 addPet("momo", A, 88)
2. 呼叫 ownerOf(1)，應回傳 A
3. owner 呼叫 setPetLevel(1, 5)
4. A 呼叫 getPetAttribute(1)，應看到 level 是 5
5. A 呼叫 listPet(1, 100)
6. B 呼叫 buyPet(1)，並附上 100 wei
7. 呼叫 ownerOf(1)，應回傳 B
```

### Material

```text
1. owner 呼叫 increaseMaterial(A, 1, 10)
2. 呼叫 balanceOf(A, 1)，應回傳 10
3. owner 呼叫 decreaseMaterial(A, 1, 3)
4. 呼叫 balanceOf(A, 1)，應回傳 7
5. A 呼叫 listMaterial(1, 2, 50)
6. B 呼叫 buyMaterial(1)，並附上 50 wei
7. 呼叫 balanceOf(B, 1)，應回傳 2
```

## 注意事項

- 價格單位都是 wei，不是 ETH 字串。
- 兩份合約互相獨立，不會自動同步資料。
- `CryptoPets` 沒有 tokenURI，因為目前只保留最小 pet 概念。
- `CryptoMaterials` 沒有 URI 管理，因為目前只保留素材 id 與數量。
- `sellCloth` 不收錢，只移動 petSkin bit。
- `getUserPetId` 會從 `1` 掃到目前最大 `petId`，大量 pet 時不適合放進需要頻繁執行的鏈上流程。
