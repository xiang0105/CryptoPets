# Solidity 測試與風險報告

日期：2026-06-07

## 範圍

本次檢查範圍：

- `CryptoPets.sol`
- `CryptoMaterials.sol`
- `contracts/test/` 內的單元測試

本報告不是正式安全審計，只記錄目前單元測試與輕量檢查中發現的問題。

## 測試結果

執行指令：

```bash
cd contracts
npm test
```

結果：

```text
12 passing
```

已測到的穩定行為：

- `CryptoPets` 只有合約 owner 能建立 pet 與設定 level。
- pet 轉移後，`ownerOf`、`balanceOf`、`ownerToPets` 資料會同步更新。
- cloth 轉移需要來源 pet owner 或被授權者操作。
- pet 掛賣、購買、直接轉移後清除掛單皆可運作。
- `CryptoMaterials` 只有合約 owner 能增加或減少素材。
- ERC-1155 素材轉移、operator approval、掛賣 escrow、取消退回與購買都可運作。

## 發現問題與修正狀態

### 1. `buyPet` 可能把 pet 轉進不支援 ERC-721 receiver 的合約

嚴重度：中

狀態：已修正。`CryptoPets.buyPet` 成交轉移後會執行 ERC-721 receiver check；若買家是未實作 `IERC721Receiver` 的合約，交易會 revert。

位置：

- `CryptoPets.buyPet`
- `CryptoPets._transferPet`

目前 `buyPet` 成交時使用內部 `_transferPet`，沒有像 `safeTransferFrom` 一樣檢查買家若是合約時是否支援 `IERC721Receiver`。

影響：

- 若買家是一個不支援 ERC-721 receiver 的合約，pet 仍可被買進該合約。
- 如果該合約沒有再轉出 pet 的功能，pet 可能永久卡住。

測試重現：

- `contracts/test/fixtures/SecurityFixtures.sol`
- `CryptoPets.test.cjs` 中的 `risk: buyPet can transfer a pet into a contract that does not implement IERC721Receiver`

建議：

- 在 `buyPet` 內轉移後也執行 ERC-721 receiver check。
- 或新增 `safeBuyPet`，並明確標記目前 `buyPet` 是非 safe purchase。

### 2. owner 可以燒掉 escrow 中的素材，使 active listing 卡住

嚴重度：中

狀態：已修正。`CryptoMaterials.decreaseMaterial` 已禁止對 `address(this)` 扣素材，避免 owner 後台扣掉 marketplace escrow。

位置：

- `CryptoMaterials.decreaseMaterial`
- `CryptoMaterials.listMaterial`

目前素材掛賣時會先 escrow 到 `address(this)`。但 `decreaseMaterial` 允許合約 owner 對任意地址扣素材，也包含 `address(this)`。

影響：

- owner 可以把合約 escrow 中的素材扣掉。
- 對應 listing 仍然是 active。
- 買家購買會失敗，賣家取消也會失敗，因為 escrow 餘額已不足。

測試重現：

- `CryptoMaterials.test.cjs` 中的 `risk: owner can burn escrowed material and strand an active listing`

建議：

- 禁止 `decreaseMaterial(address(this), materialId, amount)`。
- 或另外追蹤 escrow 數量，避免 owner 後台扣掉掛單保管中的素材。

### 3. 測試工具鏈存在 npm audit 風險

嚴重度：低，僅限開發工具鏈

位置：

- `contracts/package.json`
- `ganache` 相關依賴樹

`npm audit` 回報 dev dependency 中有多個 vulnerabilities，主要來自 Ganache 依賴樹。

影響：

- 這不是 Solidity 合約本身漏洞。
- 但若未來要放進 CI 或長期維護，建議換用較新的本地鏈工具或更新測試依賴。

建議：

- 將 Ganache 替換為更新維護狀態較好的測試鏈工具。
- 或定期更新 dev dependencies 並重新跑測試。

## 結論

目前核心功能測試皆通過，且兩個合約層級風險已修正：

1. `buyPet` 已避免 pet 被買進不支援 ERC-721 receiver 的合約。
2. `decreaseMaterial` 已禁止扣掉 marketplace escrow 中的素材。

剩餘低風險項目是 Ganache 測試工具鏈的 dev dependency audit 風險，非 Solidity 合約本身漏洞。
