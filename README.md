# CryptoPets: 鏈上寵物養成 DApp

一個結合 ERC-721（NFT）與 ERC-1155（SFT）的 Web3 遊戲專案，實現養成、戰鬥與去中心化資產交易。

---

## 專案概述 (Overview)

CryptoPets 是一款混合式鏈上遊戲（Hybrid On-chain Game），設計核心為：

「鏈下負責遊戲體驗，鏈上負責資產所有權」

此架構可降低 Gas 消耗並提升遊戲流暢度，同時保留資產所有權與可交易性。

---

## 核心玩法 (Core Gameplay)

### 寵物養成系統
- 五大屬性：火、水、草、光、暗
- 每隻寵物具有：
  - 個體值（IV）
  - HP / ATK / DEF
  - 三階段進化

---

### 遠征系統
- 自動累積資源
- 支援離線收益
- 批次領取（Claim）

---

### 經濟與交易
- NFT 可交易
- SFT 可流通
- 支援 P2P 交易

---

## 技術架構 (Tech Stack)

### 區塊鏈
- Solidity
- ERC-721 / ERC-1155

### 前端
- HTML / CSS / JavaScript
- Phaser3

### Web3
- Ethers.js / Web3.js
- MetaMask

---

## 資料結構 (Data Schema)

### 寵物 NFT

```javascript
{
    "id": "",
    "name": "",
    "element": 1, // 元素屬性：[火、水、草、光、暗]
    "stage": 0, // 寵物階段：[0、1、2]
    "tokenURI": "",
    "stats": {
        "iv": 95,
        "hp": 120,
        "atk": 45,
        "def": 30
    },
    "exp": 1500, // 寵物升級所需經驗值
    "owner": "",
    "birthTime": ""
}
```

---

### 素材 SFT

```javascript
{
    "id": "MAT-1C",
    "name": "",
    "element": 1, // 素材屬性：[火、水、草、光、暗]
    "grade": "C", // 素材等級：[A、B、C]
    "amount": 0,
    "description": ""
}
```

---

### 回憶錄

```javascript
{
    "tokenId": "",
    "totalBattles": 0, // 總戰場場
    "winRate": 0.65, // 勝率
    "adventures": 0, // 累積遠征獎勵
    "Owners": "", // 目前的玩家
    "status": "Active" // 狀態
}
```

---

## 進化系統

```javascript
const EVOLUTION_CONFIG = {
    "ELEMENT_1": {
        "TO_STAGE_1": {
            "requiredMat": [
                { "id": "MAT-1C", "count": 5 }
            ],
            "statsBoost": 10
        }
    }
};
```

---

## 遠征系統

1. 玩家派出寵物  
2. 記錄時間  
3. 累積獎勵  
4. Claim 上鏈  

---

## 未來規劃

- PvP 系統 <!-- 可能沒有 -->
- 公會系統
- DAO 治理
- Layer2 部署

---
